# Comprehensive Authentication & Identity Architecture Plan

## Executive Summary

This document provides a comprehensive analysis and recommended path forward for PlayerARC's authentication, role, and identity system. It synthesizes:
- Current Better Auth implementation
- Parent role requirements (multi-org, email-based linking)
- Player passport access requirements
- Invitation flow needs
- Multi-role capability requirements

**Status**: Planning Phase - No code changes until architecture is finalized

---

## 1. Current State Analysis

### 1.1 Role System Architecture

#### Current Dual-Layer System

**Layer 1: Better Auth Organizational Roles**
- **Purpose**: Organizational hierarchy and Better Auth permissions
- **Roles**: `owner`, `admin`, `member`, `coach`, `parent`
- **Location**: `member.role` (Better Auth `member` table)
- **Used For**: 
  - Better Auth access control
  - Organizational permissions
  - Invitation role assignment

**Layer 2: Functional Roles (PlayerARC Capabilities)**
- **Purpose**: User capabilities within sports club context
- **Roles**: `["coach", "parent", "admin"]` (array, multiple allowed)
- **Location**: `member.functionalRoles` (custom Convex field)
- **Used For**:
  - UI display (role badges)
  - Feature access (coach dashboard, parent dashboard)
  - Player linking (parent → children)
  - Coach assignments (coach → teams)

#### Current Issues

1. **Role Duplication**: "coach" and "parent" exist in BOTH systems
2. **Confusion**: Unclear which system to use for what
3. **Manual Mapping**: Better Auth "admin" → functional "admin" requires manual code
4. **Invitation Limitation**: Can only set Better Auth role, not functional roles
5. **Access Control Mismatch**: Permissions check Better Auth roles, UI shows functional roles

### 1.2 Parent-Player Relationship

#### Current Implementation

**Parent Identification**:
- Parents are identified by **email matching**
- Player record has `parents[]` array with parent profiles:
  ```typescript
  parents: Array<{
    id: string;
    firstName: string;
    surname: string;
    email: string;  // ← Matches Better Auth user.email
    phone?: string;
    relationship?: string;
    isPrimary?: boolean;
  }>
  ```

**Parent-Player Linking**:
- `linkPlayersToParent` mutation updates `player.parentEmail` field
- `getMembersWithDetails` query filters players where:
  - `player.parentEmail === user.email` OR
  - `player.inferredParentEmail === user.email` OR
  - `player.parents[].email === user.email`

**Critical Requirements** (from PARENT_DASHBOARD_ANALYSIS.md):
1. **Organization-Scoped**: Parent dashboard is at `/orgs/[orgId]/parents`
2. **Multi-Organization Support**: Parent can have children in multiple organizations
3. **Email-Based Matching**: Parent identified by email in `players.parents[]` array
4. **Multi-Child Support**: Parent can have multiple children
5. **Multi-Sport Support**: Single child can play multiple sports

### 1.3 Player Passport Access Requirements

#### Access Control Needs (from PLAYER_PASSPORT_ANALYSIS.md)

**Permission Model**:
- **Coaches**: Full edit access to their players
- **Parents**: View own children + limited feedback
- **Admins**: View all + edit all
- **Players**: View own passport + self-assessment

**Access Determination**:
- **Parent Access**: Check if `player.parents[].email === user.email`
- **Coach Access**: Check if `coachAssignments.teams` includes player's teams
- **Admin Access**: Check if `member.role === "admin" || member.role === "owner"`
- **Player Access**: Check if `player.userId === currentUser.id` (future)

### 1.4 Invitation Flow Current State

**Current Process**:
1. Admin invites with Better Auth role (`member` or `admin`)
2. User accepts invitation → Better Auth creates `member` record
3. **Manual step**: Code maps Better Auth "admin" → functional "admin"
4. Admin manually assigns functional roles via UI checkboxes
5. Admin manually links players to parent (if parent role)

**Issues**:
- No way to set functional roles during invitation
- Parent role assignment requires manual player linking
- No automatic parent-player linking based on email
- Invitation doesn't know what functional roles user should have

---

## 2. Requirements Synthesis

### 2.1 Core Requirements

#### A. Multi-Role Support
- ✅ User can be BOTH coach AND parent
- ✅ User can be coach AND admin
- ✅ User can be parent AND admin
- ✅ User can be all three simultaneously

#### B. Parent Requirements
- ✅ Parent identified by email matching (`players.parents[].email`)
- ✅ Parent can have children in multiple organizations
- ✅ Parent dashboard is organization-scoped
- ✅ Parent can view children's passports
- ✅ Parent can provide feedback/notes

#### C. Coach Requirements
- ✅ Coach assigned to specific teams
- ✅ Coach can view/edit players on their teams
- ✅ Coach can access coach dashboard
- ✅ Coach can update player passports

#### D. Admin Requirements
- ✅ Admin can manage organization
- ✅ Admin can manage users and roles
- ✅ Admin can view/edit all players
- ✅ Admin can assign functional roles

#### E. Invitation Requirements
- ✅ Invite users to organization
- ✅ Set initial Better Auth role
- ✅ Suggest functional roles during invitation
- ✅ Auto-assign functional roles on acceptance
- ✅ Auto-link parent to children (if email matches)

### 2.2 Access Control Requirements

#### Permission Checks Needed

**For Player Passport**:
```typescript
function canViewPlayerPassport(user, player, member) {
  // Admin/Owner: Always yes
  if (member.role === "admin" || member.role === "owner") return true;
  
  // Parent: If email matches player.parents[].email
  if (member.functionalRoles?.includes("parent")) {
    const parentEmail = user.email.toLowerCase().trim();
    return player.parents?.some(p => 
      p.email.toLowerCase().trim() === parentEmail
    );
  }
  
  // Coach: If assigned to player's teams
  if (member.functionalRoles?.includes("coach")) {
    return coachAssignments.teams.some(teamId => 
      player.teams.includes(teamId)
    );
  }
  
  return false;
}

function canEditPlayerPassport(user, player, member) {
  // Admin/Owner: Always yes
  if (member.role === "admin" || member.role === "owner") return true;
  
  // Coach: If assigned to player's teams
  if (member.functionalRoles?.includes("coach")) {
    return coachAssignments.teams.some(teamId => 
      player.teams.includes(teamId)
    );
  }
  
  return false;
}
```

**For Parent Dashboard**:
```typescript
function canAccessParentDashboard(member, organizationId) {
  // Must have parent functional role
  if (!member.functionalRoles?.includes("parent")) return false;
  
  // Must be member of organization
  if (member.organizationId !== organizationId) return false;
  
  return true;
}

function getParentChildren(member, organizationId) {
  const parentEmail = member.user.email.toLowerCase().trim();
  
  // Get all players in organization
  const orgPlayers = getPlayersByOrganization(organizationId);
  
  // Filter by parent email match
  return orgPlayers.filter(player =>
    player.parents?.some(p => 
      p.email.toLowerCase().trim() === parentEmail
    )
  );
}
```

---

## 3. Recommended Architecture

### 3.1 Simplified Dual-Layer System

**Principle**: Clear separation of concerns

#### Layer 1: Better Auth Roles (Hierarchy)
- **Purpose**: Organizational hierarchy and Better Auth permissions
- **Roles**: `owner`, `admin`, `member` (ONLY these three)
- **Removed**: `coach`, `parent` (moved to functional roles)
- **Used For**:
  - Organizational permissions (can manage org, can invite, etc.)
  - Better Auth access control
  - Invitation role assignment

#### Layer 2: Functional Roles (Capabilities)
- **Purpose**: User capabilities within sports club context
- **Roles**: `["coach", "parent", "admin"]` (array, multiple allowed)
- **Used For**:
  - UI display (role badges)
  - Feature access (dashboards)
  - Player linking (parent → children)
  - Coach assignments (coach → teams)
  - Permission checks (can view/edit players)

### 3.2 Role Mapping Strategy

#### Better Auth Role → Functional Role Mapping

**Automatic Mapping** (via `onMemberAdded` hook):
- Better Auth `"admin"` or `"owner"` → Auto-add functional `"admin"`
- Better Auth `"member"` → No automatic mapping (admin assigns later)

**Invitation-Based Mapping**:
- Invitation metadata can suggest functional roles
- Hook auto-assigns suggested roles on acceptance
- Example: Invite as "member" with metadata `{suggestedFunctionalRoles: ["coach"]}`

#### Functional Role → Better Auth Role

**No reverse mapping needed**:
- Functional roles are capabilities, not hierarchy
- Better Auth role determines organizational permissions
- Functional roles determine feature access

### 3.3 Parent-Player Linking Strategy

#### Automatic Linking (Recommended)

**On Parent Role Assignment**:
1. User gets functional role "parent" assigned
2. System automatically finds players where `player.parents[].email === user.email`
3. Links are organization-scoped (only players in current org)
4. Updates `player.parentEmail` if not set

**On Player Creation**:
1. When player is created with parent email
2. System checks if user with that email exists in organization
3. If user has functional role "parent", auto-links
4. Adds parent to `player.parents[]` array

**On Invitation Acceptance**:
1. User accepts invitation
2. If invitation metadata suggests "parent" role
3. System auto-assigns functional role "parent"
4. System auto-links players where email matches

#### Manual Linking (Fallback)

- Admin can manually link players to parent via UI
- Used when:
  - Email doesn't match exactly
  - Parent email not in `players.parents[]` array
  - Need to link to different email address

### 3.4 Invitation Flow Design

#### Enhanced Invitation Process

**Step 1: Admin Invites User**
```typescript
await authClient.organization.inviteMember({
  email: "parent@example.com",
  organizationId: orgId,
  role: "member", // Better Auth role (hierarchy)
  metadata: {
    suggestedFunctionalRoles: ["parent"], // Functional roles (capabilities)
    suggestedPlayerLinks: ["playerId1", "playerId2"], // Optional: specific players
  },
});
```

**Step 2: User Accepts Invitation**
- Better Auth creates `member` record with `role: "member"`
- `onMemberAdded` hook fires

**Step 3: Auto-Assignment Hook**
```typescript
async onMemberAdded(data) {
  const { member, organization, role, invitation } = data;
  
  // 1. Auto-map Better Auth "admin"/"owner" to functional "admin"
  if (role === "admin" || role === "owner") {
    await addFunctionalRole(member.userId, "admin");
  }
  
  // 2. Auto-assign suggested functional roles from invitation
  const suggestedRoles = invitation?.metadata?.suggestedFunctionalRoles || [];
  for (const functionalRole of suggestedRoles) {
    await addFunctionalRole(member.userId, functionalRole);
  }
  
  // 3. Auto-link parent to children (if parent role assigned)
  if (suggestedRoles.includes("parent")) {
    await autoLinkParentToChildren(member.user, organization.id);
  }
  
  // 4. Auto-link specific players (if provided)
  const suggestedPlayers = invitation?.metadata?.suggestedPlayerLinks || [];
  if (suggestedPlayers.length > 0) {
    await linkSpecificPlayers(member.user.email, suggestedPlayers);
  }
}
```

**Step 4: User Redirected**
- Based on functional roles assigned
- Parent → `/orgs/[orgId]/parents`
- Coach → `/orgs/[orgId]/coach`
- Admin → `/orgs/[orgId]/admin`
- Multiple roles → Priority: Coach > Admin > Parent

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Remove Duplicate Better Auth Roles
**Goal**: Clean up role confusion

**Changes**:
- Remove `coach` and `parent` from Better Auth roles
- Keep only: `owner`, `admin`, `member`
- Update `accessControl.ts` to remove duplicate roles
- Update `auth.ts` to remove from roles object

**Files**:
- `packages/backend/convex/betterAuth/accessControl.ts`
- `packages/backend/convex/auth.ts`
- `apps/web/src/lib/accessControl.ts`

**Migration**:
- Existing members with Better Auth "coach" or "parent" roles:
  - Run migration to set `role: "member"`
  - Ensure functional roles are set correctly
  - Verify no data loss

#### 1.2 Implement `onMemberAdded` Hook
**Goal**: Automatic role assignment

**Changes**:
- Add `onMemberAdded` hook to `auth.ts`
- Implement auto-mapping: Better Auth "admin"/"owner" → functional "admin"
- Implement auto-assignment of suggested functional roles
- Add logging for debugging

**Files**:
- `packages/backend/convex/auth.ts`
- `packages/backend/convex/models/members.ts` (helper functions)

#### 1.3 Update Invitation UI
**Goal**: Allow selecting functional roles during invitation

**Changes**:
- Add functional role checkboxes to invitation dialog
- Store selected roles in invitation metadata
- Update invitation mutation to include metadata

**Files**:
- `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

### Phase 2: Parent-Player Auto-Linking (Week 2-3)

#### 2.1 Auto-Link on Role Assignment
**Goal**: Automatically link parent to children when role assigned

**Changes**:
- Add `autoLinkParentToChildren` function
- Call when functional role "parent" is assigned
- Organization-scoped linking
- Email-based matching

**Files**:
- `packages/backend/convex/models/members.ts`
- `packages/backend/convex/models/players.ts`

#### 2.2 Auto-Link on Invitation Acceptance
**Goal**: Link parent to children when accepting invitation

**Changes**:
- Extend `onMemberAdded` hook to auto-link if parent role
- Check `players.parents[].email` for matches
- Update `player.parentEmail` if not set

**Files**:
- `packages/backend/convex/auth.ts`
- `packages/backend/convex/models/players.ts`

#### 2.3 Auto-Link on Player Creation
**Goal**: Link existing parent users when player created

**Changes**:
- In `createPlayer` mutation, check for existing parent users
- If parent email matches user in organization, auto-link
- Add parent to `player.parents[]` array

**Files**:
- `packages/backend/convex/models/players.ts`

### Phase 3: Access Control Updates (Week 3-4)

#### 3.1 Update Permission Checks
**Goal**: Use functional roles for capability checks

**Changes**:
- Update player passport access checks
- Use functional roles for coach/parent permissions
- Use Better Auth roles for organizational permissions
- Add helper functions for permission checks

**Files**:
- `packages/backend/convex/models/players.ts`
- `apps/web/src/app/orgs/[orgId]/players/[playerId]/page.tsx`

#### 3.2 Update Parent Dashboard Access
**Goal**: Ensure parent dashboard uses correct permission checks

**Changes**:
- Check functional role "parent" for access
- Check organization membership
- Filter players by email match

**Files**:
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- `packages/backend/convex/models/players.ts` (getPlayersForParent query)

### Phase 4: Testing & Refinement (Week 4-5)

#### 4.1 Comprehensive Testing
- Test invitation flow with all role combinations
- Test parent-player auto-linking scenarios
- Test access control for all user types
- Test multi-organization parent scenarios

#### 4.2 Documentation
- Update architecture documentation
- Create user guides for role assignment
- Document invitation flow
- Document parent-player linking

---

## 5. Detailed Implementation Specifications

### 5.1 `onMemberAdded` Hook Implementation

```typescript
// packages/backend/convex/auth.ts

organization({
  // ... existing config ...
  
  async onMemberAdded(data) {
    const { member, organization, role, invitation } = data;
    const userId = member.userId;
    const organizationId = organization.id;
    
    console.log("[onMemberAdded] Member added:", {
      userId,
      organizationId,
      betterAuthRole: role,
      invitationId: invitation?.id,
    });
    
    // 1. Auto-map Better Auth "admin"/"owner" to functional "admin"
    if (role === "admin" || role === "owner") {
      console.log("[onMemberAdded] Auto-assigning functional 'admin' role");
      await ctx.runMutation(api.models.members.addFunctionalRole, {
        organizationId,
        userId,
        functionalRole: "admin",
      });
    }
    
    // 2. Auto-assign suggested functional roles from invitation metadata
    const suggestedRoles = invitation?.metadata?.suggestedFunctionalRoles || [];
    if (suggestedRoles.length > 0) {
      console.log("[onMemberAdded] Auto-assigning suggested functional roles:", suggestedRoles);
      for (const functionalRole of suggestedRoles) {
        await ctx.runMutation(api.models.members.addFunctionalRole, {
          organizationId,
          userId,
          functionalRole,
        });
      }
    }
    
    // 3. Auto-link parent to children (if parent role assigned)
    const hasParentRole = 
      suggestedRoles.includes("parent") ||
      (role === "admin" || role === "owner"); // Admins can also be parents
    
    if (hasParentRole) {
      console.log("[onMemberAdded] Auto-linking parent to children");
      const user = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        }
      );
      
      if (user?.email) {
        await ctx.runMutation(api.models.players.autoLinkParentToChildren, {
          parentEmail: user.email,
          organizationId,
        });
      }
    }
    
    // 4. Auto-link specific players (if provided in invitation)
    const suggestedPlayers = invitation?.metadata?.suggestedPlayerLinks || [];
    if (suggestedPlayers.length > 0) {
      console.log("[onMemberAdded] Auto-linking specific players:", suggestedPlayers);
      const user = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        }
      );
      
      if (user?.email) {
        await ctx.runMutation(api.models.players.linkPlayersToParent, {
          playerIds: suggestedPlayers,
          parentEmail: user.email,
          organizationId,
        });
      }
    }
  },
})
```

### 5.2 Auto-Link Parent to Children Function

```typescript
// packages/backend/convex/models/players.ts

/**
 * Automatically link parent to children based on email matching
 * Organization-scoped: only links players in the specified organization
 */
export const autoLinkParentToChildren = mutation({
  args: {
    parentEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    linked: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.parentEmail.toLowerCase().trim();
    
    // Get all players in organization
    const orgPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    
    let linked = 0;
    let skipped = 0;
    
    for (const player of orgPlayers) {
      // Check if parent email matches in players.parents[] array
      const hasParentMatch = player.parents?.some((parent: any) =>
        parent.email?.toLowerCase().trim() === normalizedEmail
      );
      
      if (hasParentMatch) {
        // Update parentEmail if not set
        if (!player.parentEmail) {
          await ctx.db.patch(player._id, {
            parentEmail: normalizedEmail,
          });
        }
        linked++;
      } else {
        skipped++;
      }
    }
    
    return { linked, skipped };
  },
});
```

### 5.3 Enhanced Invitation UI

```typescript
// apps/web/src/app/orgs/[orgId]/admin/users/page.tsx

// Add state for functional roles
const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<FunctionalRole[]>([]);

// Update invitation handler
const handleInviteMember = async () => {
  // ... validation ...
  
  const { error } = await authClient.organization.inviteMember({
    email: inviteEmail,
    organizationId: orgId,
    role: inviteRole as "member" | "admin",
    metadata: {
      suggestedFunctionalRoles: inviteFunctionalRoles, // Store for hook
    },
  });
  
  // ... error handling ...
};
```

### 5.4 Permission Check Helpers

```typescript
// packages/backend/convex/models/players.ts

/**
 * Check if user can view a player's passport
 */
export const canViewPlayerPassport = query({
  args: {
    playerId: v.id("players"),
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) return false;
    
    // Get player
    const player = await ctx.db.get(args.playerId);
    if (!player || player.organizationId !== args.organizationId) {
      return false;
    }
    
    // Get member record
    const member = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: currentUser._id, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq" },
        ],
      }
    );
    
    if (!member) return false;
    
    // Admin/Owner: Always yes
    if (member.role === "admin" || member.role === "owner") {
      return true;
    }
    
    const functionalRoles = (member as any).functionalRoles || [];
    
    // Parent: If email matches player.parents[].email
    if (functionalRoles.includes("parent")) {
      const parentEmail = currentUser.email.toLowerCase().trim();
      return player.parents?.some((parent: any) =>
        parent.email?.toLowerCase().trim() === parentEmail
      ) || false;
    }
    
    // Coach: If assigned to player's teams
    if (functionalRoles.includes("coach")) {
      const coachAssignment = await ctx.db
        .query("coachAssignments")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", currentUser._id).eq("organizationId", args.organizationId)
        )
        .first();
      
      if (!coachAssignment) return false;
      
      // Get player's teams
      const teamLinks = await ctx.db
        .query("teamPlayers")
        .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
        .collect();
      
      const playerTeamIds = teamLinks.map(link => link.teamId);
      
      // Check if coach is assigned to any of player's teams
      return coachAssignment.teams.some(teamId => playerTeamIds.includes(teamId));
    }
    
    return false;
  },
});
```

---

## 6. Migration Strategy

### 6.1 Existing Data Migration

#### Step 1: Fix Better Auth Roles
- Find all members with `role: "coach"` or `role: "parent"`
- Update to `role: "member"`
- Ensure functional roles are set correctly

#### Step 2: Sync Functional Roles
- Run `syncFunctionalRolesFromBetterAuthRole` mutation
- This fixes members who have Better Auth "admin" but no functional "admin"

#### Step 3: Fix Parent-Player Links
- For all users with functional role "parent"
- Run `autoLinkParentToChildren` for each organization
- Verify links are correct

### 6.2 Rollout Plan

1. **Week 1**: Implement Phase 1 (foundation)
2. **Week 2**: Test Phase 1, implement Phase 2 (auto-linking)
3. **Week 3**: Test Phase 2, implement Phase 3 (access control)
4. **Week 4**: Comprehensive testing
5. **Week 5**: Documentation and refinement

---

## 7. Open Questions & Decisions Needed

### 7.1 Role Assignment

**Q1**: Should functional "admin" always be auto-assigned when Better Auth role is "admin"?
- **Recommendation**: Yes, automatically
- **Rationale**: Admins need admin UI access

**Q2**: Should we allow Better Auth "member" with functional "admin"?
- **Recommendation**: No, Better Auth "admin" should be required for functional "admin"
- **Rationale**: Maintains hierarchy integrity

**Q3**: Can a user have functional "admin" without Better Auth "admin"?
- **Recommendation**: No, functional "admin" requires Better Auth "admin" or "owner"
- **Rationale**: Admin capabilities require admin hierarchy

### 7.2 Parent-Player Linking

**Q4**: Should parent-player linking be automatic or manual?
- **Recommendation**: Automatic with manual override
- **Rationale**: Reduces admin work, but allows flexibility

**Q5**: What happens if parent email doesn't match exactly?
- **Recommendation**: Manual linking required
- **Rationale**: Prevents incorrect links

**Q6**: Should we support multiple parent emails per player?
- **Recommendation**: Yes, `players.parents[]` array supports this
- **Rationale**: Some children have multiple guardians

### 7.3 Invitation Flow

**Q7**: Should invitations allow selecting functional roles?
- **Recommendation**: Yes, with checkboxes
- **Rationale**: Faster onboarding, less manual work

**Q8**: Should we support invitation templates (Coach, Parent, Admin)?
- **Recommendation**: Yes, as Phase 4 enhancement
- **Rationale**: Further reduces admin work

**Q9**: Should invitations auto-link specific players?
- **Recommendation**: Yes, optional field in invitation
- **Rationale**: Useful when inviting parent of specific child

### 7.4 Access Control

**Q10**: Should access control check Better Auth roles or functional roles?
- **Recommendation**: Both, depending on permission type
  - Organizational permissions: Better Auth roles
  - Feature access: Functional roles
- **Rationale**: Clear separation of concerns

**Q11**: What permissions should functional "admin" have?
- **Recommendation**: Admin UI access, user management, role assignment
- **Rationale**: Different from Better Auth "admin" (org management)

---

## 8. Success Criteria

### 8.1 Functional Requirements

- [ ] Users can be assigned multiple functional roles (coach + parent)
- [ ] Invitations can set functional roles
- [ ] Functional roles auto-assign on invitation acceptance
- [ ] Parent-player linking is automatic when email matches
- [ ] Access control correctly checks both role systems
- [ ] Parent dashboard shows only children in current organization
- [ ] Player passport access respects all permission rules

### 8.2 Technical Requirements

- [ ] No duplicate roles between Better Auth and functional roles
- [ ] `onMemberAdded` hook works correctly
- [ ] Auto-linking works for all scenarios
- [ ] Migration script fixes existing data
- [ ] All tests pass
- [ ] Documentation is complete

### 8.3 User Experience Requirements

- [ ] Invitation flow is intuitive
- [ ] Role assignment is clear
- [ ] Parent dashboard works correctly
- [ ] Player passport access is correct
- [ ] No confusion about roles

---

## 9. Risk Assessment

### 9.1 High Risk

**Risk**: Breaking existing parent-player links
- **Mitigation**: Run migration script to verify links before deployment
- **Testing**: Test with existing data

**Risk**: Access control bugs allowing unauthorized access
- **Mitigation**: Comprehensive permission testing
- **Testing**: Test all role combinations

### 9.2 Medium Risk

**Risk**: Performance issues with auto-linking
- **Mitigation**: Batch operations, add indexes
- **Testing**: Load testing with large datasets

**Risk**: Confusion during migration
- **Mitigation**: Clear documentation, communication
- **Testing**: User acceptance testing

### 9.3 Low Risk

**Risk**: UI changes breaking existing workflows
- **Mitigation**: Incremental changes, backward compatibility
- **Testing**: Regression testing

---

## 10. Next Steps

### Immediate Actions (Before Implementation)

1. **Review this document** with team
2. **Answer open questions** (Section 7)
3. **Approve architecture** decisions
4. **Create detailed tickets** for each phase
5. **Set up testing environment** with sample data

### Implementation Order

1. **Phase 1**: Foundation (remove duplicates, add hook)
2. **Phase 2**: Auto-linking (parent-player relationships)
3. **Phase 3**: Access control (permission updates)
4. **Phase 4**: Testing & refinement

### Success Metrics

- **Week 1**: Phase 1 complete, tests passing
- **Week 2**: Phase 2 complete, auto-linking working
- **Week 3**: Phase 3 complete, access control correct
- **Week 4**: All tests passing, documentation complete
- **Week 5**: Production deployment ready

---

## 11. Conclusion

This comprehensive plan addresses:
- ✅ Current architecture issues
- ✅ Parent role requirements
- ✅ Player passport access requirements
- ✅ Invitation flow improvements
- ✅ Multi-role support
- ✅ Auto-linking capabilities
- ✅ Access control updates

**Recommended Path**: Implement Phase 1-3 as outlined, with careful testing and migration of existing data.

**Key Principle**: Clear separation between organizational hierarchy (Better Auth roles) and user capabilities (functional roles), with automatic assignment and linking where possible.

---

## Appendix: Decision Log

| Decision | Date | Rationale |
|----------|------|-----------|
| Remove "coach" and "parent" from Better Auth roles | TBD | Eliminates confusion, clear separation |
| Auto-assign functional "admin" when Better Auth "admin" | TBD | Reduces manual work |
| Auto-link parent to children on role assignment | TBD | Improves user experience |
| Use invitation metadata for functional roles | TBD | Faster onboarding |
| Check functional roles for capability permissions | TBD | Correct access control |

