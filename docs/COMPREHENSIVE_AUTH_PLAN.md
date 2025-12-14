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

### 1.0 MVP Signup & Approval Flow Analysis

#### MVP Signup Flow (Single Organization Model)

**Step 1: User Signs Up**
- User creates account via Clerk (email/password or social)
- `upsertUser` mutation creates user record in Convex
- **First user**: Auto-approved as Admin, `onboardingCompleted: true`
- **Subsequent users**: `approvalStatus: "pending"`, `onboardingCompleted: false`

**Step 2: Onboarding (New Users Only)**
- User sees `OnboardingForm` component
- **Role Selection**: User can select multiple roles (Coach, Parent, Admin)
- **Role-Specific Data Collection**:
  - **Coach**: Sport, Teams, Age Groups, Gender
  - **Parent**: Email (auto-filled from Clerk), Address, Children Names (manual entry or smart match)
  - **Admin**: Confirmation message only
- User submits → `completeOnboarding` mutation:
  - Sets `onboardingCompleted: true`
  - Sets `approvalStatus: "pending"` (unless first user)
  - Stores `requestedRoles` array
  - Stores role-specific data (teams, ageGroups, children, etc.)

**Step 3: Approval Status Screens**
- **Pending**: Yellow screen with clock icon, shows requested roles
- **Rejected**: Red screen with X icon, shows rejection reason
- User cannot access app until approved

**Step 4: Admin Approval Dashboard**
- Admin views `UserApprovalDashboard` component
- Lists all pending users with:
  - Requested roles (badges)
  - Role-specific data (teams, children, etc.)
  - Smart matches for parents (email, surname, phone, address matching)
- Admin can:
  - **Approve**: Configure role assignments (teams for coaches, linked players for parents)
  - **Reject**: Provide rejection reason
- `approveUser` mutation:
  - Sets `approvalStatus: "approved"`
  - Sets `roles` array (approved roles)
  - Sets role-specific data (teams, ageGroups)
  - Links parent to players (updates `player.parents[]` array)
  - Creates audit trail entry

**Key MVP Features**:
- ✅ Multi-role selection during onboarding
- ✅ Smart matching for parent-player linking (email, surname, phone, address, children names)
- ✅ Role-specific data collection (teams for coaches, children for parents)
- ✅ Admin configures role assignments during approval
- ✅ Audit trail of all approval actions
- ✅ Status screens (pending/rejected) prevent app access

#### Current Main App Flow (Multi-Organization Model)

**Step 1: User Signs Up**
- User creates account via Better Auth
- No onboarding required
- User can immediately browse organizations

**Step 2: Request to Join Organization**
- User navigates to `/orgs/join`
- Selects organization
- Selects role (member, coach, parent)
- Optionally adds message
- Submits → `createJoinRequest` mutation creates `orgJoinRequests` record

**Step 3: Admin Approval**
- Admin views `/orgs/[orgId]/admin/users/approvals`
- Lists pending requests for that organization
- Admin can approve/reject
- `approveJoinRequest` mutation:
  - Creates Better Auth `member` record with requested role
  - Updates request status to "approved"

**Key Differences from MVP**:
- ❌ No onboarding flow
- ❌ No role-specific data collection during signup
- ❌ No smart matching for parent-player linking
- ❌ No functional role assignment during approval
- ❌ No parent-player linking during approval
- ✅ Organization-scoped (user can join multiple orgs)
- ✅ Simpler flow (no status screens blocking access)

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

### 1.5 Signup & Approval Flow Comparison

| Feature | MVP (Single Org) | Current Main App (Multi-Org) | Recommended Hybrid |
|---------|------------------|------------------------------|---------------------|
| **Onboarding** | ✅ Required for all new users | ❌ None | ✅ Optional, organization-specific |
| **Role Selection** | ✅ During onboarding (multi-role) | ✅ During join request (single role) | ✅ During join request (multi-role) |
| **Role-Specific Data** | ✅ Collected during onboarding | ❌ Not collected | ✅ Collected during join request |
| **Smart Matching** | ✅ Parent-player smart matching | ❌ None | ✅ Parent-player smart matching |
| **Approval Dashboard** | ✅ User-level approval | ✅ Organization-level approval | ✅ Organization-level approval |
| **Status Screens** | ✅ Blocks app access | ❌ No blocking | ✅ Blocks org access only |
| **Parent-Player Linking** | ✅ During approval | ❌ Manual after approval | ✅ During approval (auto + manual) |
| **Functional Roles** | ✅ Assigned during approval | ❌ Manual after approval | ✅ Assigned during approval |

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

#### F. Signup & Approval Requirements
- ✅ Users can sign up without invitation
- ✅ Users can request to join organizations
- ✅ Users can select multiple roles during join request
- ✅ Users can provide role-specific data (teams, children, etc.)
- ✅ Smart matching for parent-player linking
- ✅ Admin approval dashboard with role configuration
- ✅ Status screens for pending/rejected requests
- ✅ Parent-player linking during approval
- ✅ Functional role assignment during approval

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

**Purpose**: Organizational hierarchy and Better Auth permissions

**Roles**: `owner`, `admin`, `member` (ONLY these three)

**Removed**: `coach`, `parent` (moved to functional roles)

**Used For**:
- Organizational permissions (can manage org, can invite, etc.)
- Better Auth access control
- Invitation role assignment

##### Detailed Role Definitions

###### 1. **Owner** Role

**What It Is**:
- The creator/founder of the organization
- Highest level of organizational authority
- Typically only one owner per organization (though Better Auth supports multiple)

**What It Can Do**:
- ✅ **Organization Management**: Full control over organization settings
  - Update organization name, logo, colors
  - Delete the organization
  - Transfer ownership to another member
- ✅ **Member Management**: Full control over all members
  - Invite members with any role
  - Remove any member (including admins)
  - Change any member's Better Auth role
- ✅ **Access Control**: Can perform any action in the organization
  - All permissions granted by default
  - Can override any access control check
- ✅ **Better Auth Features**: Full access to Better Auth organization features
  - Manage organization settings
  - View organization audit logs
  - Manage organization billing (if applicable)

**When to Use**:
- First user who creates the organization
- Organization founder/principal
- Person with ultimate responsibility for the organization

**Example**:
```typescript
// Owner can do everything
const owner = {
  role: "owner",
  canManageOrg: true,
  canInviteMembers: true,
  canRemoveMembers: true,
  canChangeRoles: true,
  canDeleteOrg: true,
  // All Better Auth permissions granted
};
```

###### 2. **Admin** Role

**What It Is**:
- Organizational administrator
- Delegated authority to manage the organization
- Can have multiple admins per organization

**What It Can Do**:
- ✅ **Organization Management**: Most organization settings
  - Update organization name, logo, colors
  - Cannot delete the organization
  - Cannot transfer ownership
- ✅ **Member Management**: Full control over members
  - Invite members with any role
  - Remove members (except owner)
  - Change member roles (except cannot make/remove owner)
  - Approve/reject join requests
- ✅ **Access Control**: Can perform most actions
  - All permissions granted by default
  - Cannot override owner-level restrictions
- ✅ **Better Auth Features**: Full access to Better Auth organization features
  - Manage organization settings (except deletion/ownership)
  - View organization audit logs
  - Manage organization billing (if applicable)

**What It Cannot Do**:
- ❌ Delete the organization
- ❌ Transfer ownership
- ❌ Remove the owner
- ❌ Change owner's role

**When to Use**:
- Club administrators
- Organization managers
- Delegated authority holders
- People who need to manage members and settings

**Example**:
```typescript
// Admin can manage org and members, but not delete org
const admin = {
  role: "admin",
  canManageOrg: true, // Except deletion
  canInviteMembers: true,
  canRemoveMembers: true, // Except owner
  canChangeRoles: true, // Except owner
  canDeleteOrg: false,
  // All Better Auth permissions granted (except owner-only)
};
```

###### 3. **Member** Role

**What It Is**:
- Standard organization member
- Default role for all new members
- Most common role in the organization

**What It Can Do**:
- ✅ **Basic Access**: Standard member permissions
  - View organization information
  - View other members (depending on privacy settings)
  - Access organization features based on functional roles
- ✅ **Better Auth Features**: Standard member access
  - View organization
  - Leave the organization
  - Update own profile

**What It Cannot Do**:
- ❌ Manage organization settings
- ❌ Invite or remove members
- ❌ Change member roles
- ❌ Approve/reject join requests
- ❌ Access admin-only features

**When to Use**:
- Default for all new members
- Coaches (who don't need org management)
- Parents (who don't need org management)
- Regular users who just need access to features

**Example**:
```typescript
// Member has basic access, features determined by functional roles
const member = {
  role: "member",
  canManageOrg: false,
  canInviteMembers: false,
  canRemoveMembers: false,
  canChangeRoles: false,
  // Access to features based on functionalRoles
  functionalRoles: ["coach", "parent"], // Determines actual capabilities
};
```

##### Why NOT Have "Coach" and "Parent" in Better Auth?

**Reason 1: Multi-Role Support**

Better Auth roles are **mutually exclusive** - a user can only have ONE Better Auth role per organization. However, in PlayerARC:
- A user can be BOTH a coach AND a parent
- A user can be a coach AND an admin
- A user can be all three simultaneously

**Example Problem**:
```typescript
// ❌ CANNOT DO with Better Auth roles:
const user = {
  role: "coach", // Can only be ONE role
  // But they also have children! They need "parent" role too!
  // Better Auth doesn't support multiple roles
};

// ✅ CAN DO with functional roles:
const user = {
  role: "member", // Better Auth hierarchy
  functionalRoles: ["coach", "parent"], // Multiple capabilities
};
```

**Reason 2: Different Scopes**

Better Auth roles define **organizational hierarchy** (who can manage the org), while "coach" and "parent" define **capabilities** (what features they can access).

**Example**:
```typescript
// Better Auth "coach" role would imply:
// - Can manage organization? (No, that's admin's job)
// - Can invite members? (No, that's admin's job)
// - Can only coach teams? (Yes, but that's a capability, not hierarchy)

// Better Auth "parent" role would imply:
// - Can manage organization? (No, that's admin's job)
// - Can only view children? (Yes, but that's a capability, not hierarchy)
```

**Reason 3: Better Auth Best Practices**

Better Auth's organization plugin is designed for **hierarchical organizations** with clear management structures:
- **Owner**: Ultimate authority
- **Admin**: Delegated management
- **Member**: Standard access

Adding domain-specific roles like "coach" and "parent" mixes concerns:
- **Hierarchy** (who manages the org) vs **Capabilities** (what features they use)

**Reason 4: Flexibility**

Using functional roles allows:
- ✅ Users can have multiple capabilities
- ✅ Capabilities can be assigned/removed independently
- ✅ Capabilities don't affect organizational hierarchy
- ✅ Easier to add new capabilities (e.g., "referee", "volunteer") without changing Better Auth

**Example**:
```typescript
// Easy to add new capabilities without touching Better Auth:
const user = {
  role: "member", // Better Auth hierarchy (unchanged)
  functionalRoles: ["coach", "parent", "referee"], // New capability added easily
};
```

**Reason 5: Clear Separation of Concerns**

**Better Auth Roles** = "Who can manage the organization?"
- Owner: Ultimate authority
- Admin: Delegated management
- Member: Standard access

**Functional Roles** = "What features can they access?"
- Coach: Can access coach dashboard, manage teams
- Parent: Can access parent dashboard, view children
- Admin: Can access admin dashboard, manage users

**Example**:
```typescript
// Clear separation:
const user = {
  // Better Auth: Organizational hierarchy
  role: "member", // Cannot manage organization
  
  // Functional: Feature capabilities
  functionalRoles: ["coach", "parent"], // Can coach teams AND view children
  
  // Result: User can coach and parent, but cannot manage the organization
};
```

##### Current Issues with Having "Coach" and "Parent" in Better Auth

**Issue 1: Role Confusion**

Currently, we have "coach" and "parent" in BOTH systems:
- Better Auth role: `member.role = "coach"`
- Functional role: `member.functionalRoles = ["coach"]`

This causes confusion:
- Which one should we check for permissions?
- Which one should we display in the UI?
- What if they don't match?

**Issue 2: Cannot Support Multi-Role**

If a user is a Better Auth "coach", they cannot also be a "parent" in Better Auth. But they might have children! We need both capabilities.

**Issue 3: Access Control Mismatch**

Better Auth access control checks `member.role`, but our UI and features use `functionalRoles`. This creates a mismatch:
- User has Better Auth role "coach" but no functional role "coach"
- UI shows "No roles" but Better Auth says they're a coach
- Confusion for users and developers

**Issue 4: Invitation Limitations**

When inviting a user, we can only set ONE Better Auth role. But we want to invite someone as BOTH coach AND parent. We can't do this with Better Auth roles alone.

##### Recommended Solution

**Remove "coach" and "parent" from Better Auth roles**

Keep only: `owner`, `admin`, `member`

**Use functional roles for capabilities**:
- `functionalRoles: ["coach"]` - Can access coach features
- `functionalRoles: ["parent"]` - Can access parent features
- `functionalRoles: ["coach", "parent"]` - Can access both

**Benefits**:
- ✅ Clear separation: hierarchy vs capabilities
- ✅ Multi-role support: users can have multiple capabilities
- ✅ No confusion: one system for hierarchy, one for capabilities
- ✅ Flexible: easy to add new capabilities
- ✅ Better Auth best practices: use standard hierarchy roles

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

### 3.4 Signup & Join Request Flow Design

#### Enhanced Join Request Process (Hybrid Approach)

**Step 1: User Signs Up**
- User creates account via Better Auth (email/password or social)
- No onboarding required
- User can immediately browse organizations

**Step 2: User Requests to Join Organization**
- User navigates to `/orgs/join/[orgId]`
- **Enhanced Join Request Form**:
  - **Role Selection**: Multiple roles (coach, parent, admin) - checkboxes
  - **Role-Specific Data Collection**:
    - **Coach**: Sport, Teams, Age Groups (multi-select)
    - **Parent**: Email (auto-filled), Address, Children Names (manual or smart match)
    - **Admin**: Confirmation message
  - **Optional Message**: User can add message to admins
- User submits → `createJoinRequest` mutation:
  - Creates `orgJoinRequests` record with:
    - `requestedRole`: Primary role (for Better Auth)
    - `requestedFunctionalRoles`: Array of functional roles
    - `roleSpecificData`: Object with teams, ageGroups, children, etc.
    - `status: "pending"`

**Step 3: Status Screen (If Pending)**
- User sees pending status on `/orgs` page
- Cannot access organization until approved
- Can still browse other organizations

**Step 4: Admin Approval Dashboard**
- Admin views `/orgs/[orgId]/admin/users/approvals`
- Enhanced approval UI (similar to MVP):
  - Shows requested roles (badges)
  - Shows role-specific data
  - **Smart Matching**: For parent role, shows matched players based on:
    - Email matching
    - Surname matching
    - Phone matching
    - Address matching (postcode, town)
    - Children names matching
  - Admin can:
    - **Configure Role Assignments**:
      - Coach: Select teams, age groups
      - Parent: Select linked players (from smart matches or search)
      - Admin: Confirm
    - **Approve**: Creates member with functional roles and links
    - **Reject**: Provide rejection reason

**Step 5: Approval Processing**
- `approveJoinRequest` mutation (enhanced):
  - Creates Better Auth `member` record with `role: requestedRole`
  - Calls `onMemberAdded` hook
  - Hook auto-assigns functional roles
  - Hook auto-links parent to players (if parent role)
  - Updates request status to "approved"

### 3.5 Invitation Flow Design

#### The Three Better Auth Roles: Detailed Usage & Assignment

Before diving into the invitation flow, let's clarify how each of the three Better Auth roles (`owner`, `admin`, `member`) will be used and assigned:

##### 1. **Owner** Role - How It's Assigned & Used

**How It's Assigned**:
- ✅ **Automatically**: When a user creates a new organization, they become the `owner`
- ✅ **Manually**: An existing `owner` can transfer ownership to another member (via Better Auth API)
- ❌ **Cannot be assigned via invitation**: Invitations can only assign `admin` or `member`
- ❌ **Cannot be assigned via join request**: Join requests can only request `admin` or `member`

**When It's Used**:
- Organization creator/founder
- Person with ultimate responsibility for the organization
- Typically only one owner per organization (though Better Auth supports multiple)

**Assignment Examples**:
```typescript
// Example 1: User creates organization → automatically becomes owner
const { data } = await authClient.organization.create({
  name: "Grange GFC",
  slug: "grange-gfc",
});
// User who created it is automatically assigned role: "owner"

// Example 2: Owner transfers ownership to another member
await authClient.organization.updateMemberRole({
  memberId: "member_123",
  role: "owner", // Only current owner can do this
  organizationId: "org_123",
});
// Previous owner becomes "admin", new owner gets "owner" role
```

**What Owner Can Do**:
- ✅ Full organization management (name, logo, colors, delete org)
- ✅ Transfer ownership to another member
- ✅ Invite/remove any member (including admins)
- ✅ Change any member's role (including making/removing owners)
- ✅ All Better Auth permissions granted by default

##### 2. **Admin** Role - How It's Assigned & Used

**How It's Assigned**:
- ✅ **Via Invitation**: Admin can invite user with `role: "admin"`
- ✅ **Via Join Request**: User can request `admin` role (admin must approve)
- ✅ **Manually**: Owner or existing admin can change member's role to `admin`
- ✅ **After Approval**: When admin approves join request, they can assign `admin` role

**When It's Used**:
- Club administrators
- Organization managers
- Delegated authority holders
- People who need to manage members and organization settings
- Can have multiple admins per organization

**Assignment Examples**:
```typescript
// Example 1: Admin invites another admin via invitation
await authClient.organization.inviteMember({
  email: "newadmin@example.com",
  organizationId: "org_123",
  role: "admin", // Better Auth role: admin
  metadata: {
    suggestedFunctionalRoles: ["admin"], // Functional role: admin
  },
});
// User accepts → Better Auth role: "admin", Functional role: ["admin"]

// Example 2: User requests admin role via join request
await createJoinRequest({
  organizationId: "org_123",
  requestedRole: "admin", // Better Auth role requested
  requestedFunctionalRoles: ["admin"], // Functional role requested
});
// Admin approves → Better Auth role: "admin", Functional role: ["admin"]

// Example 3: Owner/Admin manually promotes member to admin
await authClient.organization.updateMemberRole({
  memberId: "member_123",
  role: "admin",
  organizationId: "org_123",
});
// Member's Better Auth role changes from "member" to "admin"
// Note: Functional role "admin" should also be assigned separately
```

**What Admin Can Do**:
- ✅ Manage organization settings (name, logo, colors)
- ✅ Invite/remove members (except owner)
- ✅ Change member roles (except cannot make/remove owner)
- ✅ Approve/reject join requests
- ✅ All Better Auth permissions (except owner-only: delete org, transfer ownership)

**What Admin Cannot Do**:
- ❌ Delete the organization
- ❌ Transfer ownership
- ❌ Remove the owner
- ❌ Change owner's role

##### 3. **Member** Role - How It's Assigned & Used

**How It's Assigned**:
- ✅ **Default for Invitations**: Most invitations use `role: "member"`
- ✅ **Default for Join Requests**: Most join requests use `requestedRole: "member"`
- ✅ **Automatically**: When user accepts invitation or join request, they get `member` role
- ✅ **Manually**: Admin can demote admin to `member` (or promote member to admin)

**When It's Used**:
- Default for all new members
- Coaches (who don't need org management)
- Parents (who don't need org management)
- Regular users who just need access to features
- Most common role in the organization

**Assignment Examples**:
```typescript
// Example 1: Admin invites coach as member
await authClient.organization.inviteMember({
  email: "coach@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth role: member (hierarchy)
  metadata: {
    suggestedFunctionalRoles: ["coach"], // Functional role: coach (capability)
  },
});
// User accepts → Better Auth role: "member", Functional role: ["coach"]
// Result: User can coach teams but cannot manage organization

// Example 2: Admin invites parent as member
await authClient.organization.inviteMember({
  email: "parent@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth role: member
  metadata: {
    suggestedFunctionalRoles: ["parent"], // Functional role: parent
    suggestedPlayerLinks: ["playerId1", "playerId2"], // Auto-link children
  },
});
// User accepts → Better Auth role: "member", Functional role: ["parent"]
// Result: User can view children but cannot manage organization

// Example 3: Admin invites user as both coach AND parent (member role)
await authClient.organization.inviteMember({
  email: "coachparent@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth role: member
  metadata: {
    suggestedFunctionalRoles: ["coach", "parent"], // Multiple functional roles!
    roleSpecificData: {
      teams: ["U12 Boys"], // For coach role
    },
    suggestedPlayerLinks: ["playerId1"], // For parent role
  },
});
// User accepts → Better Auth role: "member", Functional role: ["coach", "parent"]
// Result: User can coach teams AND view children, but cannot manage organization

// Example 4: User requests to join as member
await createJoinRequest({
  organizationId: "org_123",
  requestedRole: "member", // Better Auth role requested
  requestedFunctionalRoles: ["coach", "parent"], // Functional roles requested
  roleSpecificData: {
    teams: ["U12 Boys"],
    children: ["John Doe"],
  },
});
// Admin approves → Better Auth role: "member", Functional role: ["coach", "parent"]
```

**What Member Can Do**:
- ✅ View organization information
- ✅ View other members (depending on privacy settings)
- ✅ Access features based on functional roles:
  - If `functionalRoles: ["coach"]` → Can access coach dashboard, manage teams
  - If `functionalRoles: ["parent"]` → Can access parent dashboard, view children
  - If `functionalRoles: ["admin"]` → Can access admin dashboard (but Better Auth role is still "member")
- ✅ Leave the organization
- ✅ Update own profile

**What Member Cannot Do**:
- ❌ Manage organization settings
- ❌ Invite or remove members
- ❌ Change member roles
- ❌ Approve/reject join requests
- ❌ Access admin-only features (unless they have functional role "admin")

#### Enhanced Invitation Process with Auto-Assignment

**Why This Works**: Better Auth's `inviteMember` API supports a `metadata` field that can store custom data. This metadata is preserved in the invitation record and is accessible in the `onMemberAdded` hook when the user accepts. This allows us to:

1. ✅ **UI collects functional roles** during invitation
2. ✅ **Metadata stores functional roles** in invitation record
3. ✅ **Hook auto-assigns functional roles** when user accepts
4. ✅ **Zero manual steps** - fully automated

**Step 1: Admin Invites User (Enhanced UI)**

The invitation dialog is enhanced to allow selecting functional roles:

```typescript
// Enhanced Invitation Dialog UI (Simplified - Auto-Infer Better Auth Role)
const [inviteEmail, setInviteEmail] = useState("");
const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<FunctionalRole[]>([]);
const [invitePlayerLinks, setInvitePlayerLinks] = useState<string[]>([]); // Optional: specific players
const [inviteTeamAssignments, setInviteTeamAssignments] = useState<string[]>([]); // Optional: teams for coach

// Helper function to infer Better Auth role from functional roles
function inferBetterAuthRole(functionalRoles: FunctionalRole[]): "member" | "admin" {
  // If functional roles include "admin", Better Auth role should be "admin"
  if (functionalRoles.includes("admin")) {
    return "admin";
  }
  // Otherwise, default to "member"
  return "member";
}

const handleInvite = async () => {
  // Auto-infer Better Auth role from functional roles
  const betterAuthRole = inferBetterAuthRole(inviteFunctionalRoles);
  
  await authClient.organization.inviteMember({
    email: inviteEmail,
    organizationId: orgId,
    role: betterAuthRole, // Auto-inferred from functional roles
    metadata: {
      // Functional roles (capabilities) - stored in invitation metadata
      suggestedFunctionalRoles: inviteFunctionalRoles, // ["coach", "parent"] or ["admin"] or ["admin", "coach"]
      
      // Optional: Specific player links for parent role
      suggestedPlayerLinks: invitePlayerLinks, // ["playerId1", "playerId2"]
      
      // Optional: Team assignments for coach role
      roleSpecificData: {
        teams: inviteTeamAssignments,
        ageGroups: [], // Can be added to UI if needed
      },
    },
  });
};
```

**UI Components**:
- **Better Auth Role Selector**: Dropdown with "Member" or "Admin" (hierarchy)
- **Functional Roles Checkboxes**: 
  - ☐ Coach
  - ☐ Parent  
  - ☐ Admin (only if Better Auth role is "admin")
- **Optional Fields** (shown conditionally):
  - If "Coach" selected: Team selector (multi-select)
  - If "Parent" selected: Player search/selector (for specific children)

**Step 2: Invitation Email Sent**

Better Auth sends invitation email with link. The invitation record in the database contains:
- `email`: Invitee's email
- `role`: Better Auth role ("member" or "admin") - **Auto-inferred from functional roles**
  - If `suggestedFunctionalRoles` includes "admin" → `role: "admin"`
  - Otherwise → `role: "member"`
- `metadata`: Our custom data:
  ```json
  {
    "suggestedFunctionalRoles": ["coach", "parent"], // Capabilities to assign
    "suggestedPlayerLinks": ["playerId1", "playerId2"], // For parent role
    "roleSpecificData": {
      "teams": ["U12 Boys"], // For coach role
      "ageGroups": ["U12", "U14"] // Optional: age groups for coach
    }
  }
  ```

**Important**: The Better Auth `role` is **auto-inferred** from functional roles:
- **If functional roles include "admin"** → Better Auth `role: "admin"` (can manage org)
- **If functional roles are only "coach" and/or "parent"** → Better Auth `role: "member"` (cannot manage org)
- **Functional roles in metadata**: Determines feature access (what dashboards can they use?)

**Step 3: User Accepts Invitation**

- User clicks invitation link
- If not logged in, redirected to login/signup
- After authentication, Better Auth creates `member` record with:
  - `role`: The Better Auth role from invitation ("member" or "admin")
  - `organizationId`: The organization they're joining
  - `userId`: The user's ID
- **`onMemberAdded` hook fires automatically** (this is where we assign functional roles)

**Step 4: Auto-Assignment Hook (Fully Automated)**

The hook reads the invitation metadata and auto-assigns everything. Note: The Better Auth `role` was already auto-inferred from functional roles during invitation:

```typescript
async onMemberAdded(data) {
  const { member, organization, role, invitation } = data;
  const userId = member.userId;
  const organizationId = organization.id;
  
  console.log("[onMemberAdded] Member added via invitation:", {
    userId,
    organizationId,
    betterAuthRole: role, // This was auto-inferred from functional roles
    invitationId: invitation?.id,
    metadata: invitation?.metadata,
  });
  
  // 1. Auto-map Better Auth "admin"/"owner" to functional "admin"
  // This ensures owners and admins always have functional "admin" role
  if (role === "admin" || role === "owner") {
    console.log("[onMemberAdded] Auto-assigning functional 'admin' role");
    await ctx.runMutation(api.models.members.addFunctionalRole, {
      organizationId,
      userId,
      functionalRole: "admin",
    });
  }
  
  // Note: The Better Auth role was already set correctly during invitation
  // based on functional roles (if "admin" functional role → "admin" Better Auth role)
  
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
  if (suggestedRoles.includes("parent")) {
    console.log("[onMemberAdded] Auto-linking parent to children");
    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "_id", value: userId, operator: "eq" }],
      }
    );
    
    if (user?.email) {
      // Auto-link based on email matching
      await ctx.runMutation(api.models.players.autoLinkParentToChildren, {
        parentEmail: user.email,
        organizationId,
      });
      
      // Auto-link specific players (if provided in invitation)
      const suggestedPlayers = invitation?.metadata?.suggestedPlayerLinks || [];
      if (suggestedPlayers.length > 0) {
        console.log("[onMemberAdded] Auto-linking specific players:", suggestedPlayers);
        await ctx.runMutation(api.models.players.linkPlayersToParent, {
          playerIds: suggestedPlayers,
          parentEmail: user.email,
          organizationId,
        });
      }
    }
  }
  
  // 4. Auto-create coach assignments (if coach role assigned)
  if (suggestedRoles.includes("coach")) {
    console.log("[onMemberAdded] Auto-creating coach assignments");
    const roleData = invitation?.metadata?.roleSpecificData;
    const teams = roleData?.teams || [];
    
    if (teams.length > 0) {
      await ctx.runMutation(api.models.coaches.updateCoachAssignments, {
        userId,
        organizationId,
        teams,
        ageGroups: roleData?.ageGroups || [],
      });
    }
  }
  
  console.log("[onMemberAdded] ✅ Auto-assignment complete");
}
```

**Step 5: User Redirected**

- Based on functional roles assigned (NOT Better Auth role)
- Parent → `/orgs/[orgId]/parents`
- Coach → `/orgs/[orgId]/coach`
- Admin (functional) → `/orgs/[orgId]/admin`
- Multiple roles → Priority: Coach > Admin > Parent
- No functional roles → `/orgs/[orgId]` (organization overview)

**Result**: User is fully set up with:
- ✅ Better Auth role (organizational hierarchy: "member" or "admin")
- ✅ Functional roles (capabilities: ["coach", "parent", "admin"])
- ✅ Player links (if parent role)
- ✅ Coach assignments (if coach role)
- ✅ **Zero manual steps required!**

#### Complete Invitation Examples

**Example 1: Invite Coach (Member Role)**
```typescript
// Admin invites coach
await authClient.organization.inviteMember({
  email: "coach@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth: member (cannot manage org)
  metadata: {
    suggestedFunctionalRoles: ["coach"], // Functional: coach (can coach teams)
    roleSpecificData: {
      teams: ["U12 Boys", "U14 Boys"], // Auto-assign to teams
    },
  },
});

// User accepts → Result:
// - Better Auth role: "member" (cannot invite members, manage org)
// - Functional role: ["coach"] (can access coach dashboard, manage teams)
// - Coach assignments: ["U12 Boys", "U14 Boys"]
// - Redirect: /orgs/[orgId]/coach
```

**Example 2: Invite Admin (Admin Role)**
```typescript
// Admin invites another admin
await authClient.organization.inviteMember({
  email: "newadmin@example.com",
  organizationId: "org_123",
  role: "admin", // Better Auth: admin (can manage org)
  metadata: {
    suggestedFunctionalRoles: ["admin"], // Functional: admin (can access admin dashboard)
  },
});

// User accepts → Result:
// - Better Auth role: "admin" (can invite members, manage org settings)
// - Functional role: ["admin"] (can access admin dashboard)
// - Redirect: /orgs/[orgId]/admin
```

**Example 3: Invite Parent (Member Role)**
```typescript
// Admin invites parent
await authClient.organization.inviteMember({
  email: "parent@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth: member (cannot manage org)
  metadata: {
    suggestedFunctionalRoles: ["parent"], // Functional: parent (can view children)
    suggestedPlayerLinks: ["playerId1", "playerId2"], // Auto-link specific children
  },
});

// User accepts → Result:
// - Better Auth role: "member" (cannot invite members, manage org)
// - Functional role: ["parent"] (can access parent dashboard, view children)
// - Player links: ["playerId1", "playerId2"] + any auto-matched players
// - Redirect: /orgs/[orgId]/parents
```

**Example 4: Invite Coach-Parent (Member Role, Multiple Functional Roles)**
```typescript
// Admin invites someone who is both coach AND parent
await authClient.organization.inviteMember({
  email: "coachparent@example.com",
  organizationId: "org_123",
  role: "member", // Better Auth: member (cannot manage org)
  metadata: {
    suggestedFunctionalRoles: ["coach", "parent"], // Multiple functional roles!
    roleSpecificData: {
      teams: ["U12 Boys"], // For coach role
    },
    suggestedPlayerLinks: ["playerId1"], // For parent role
  },
});

// User accepts → Result:
// - Better Auth role: "member" (cannot manage org)
// - Functional roles: ["coach", "parent"] (can coach teams AND view children)
// - Coach assignments: ["U12 Boys"]
// - Player links: ["playerId1"] + auto-matched players
// - Redirect: /orgs/[orgId]/coach (priority: Coach > Parent)
```

**Example 5: Invite Admin-Coach (Admin Role, Multiple Functional Roles)**
```typescript
// Admin invites someone who needs org management AND coaching
await authClient.organization.inviteMember({
  email: "admincoach@example.com",
  organizationId: "org_123",
  role: "admin", // Better Auth: admin (can manage org)
  metadata: {
    suggestedFunctionalRoles: ["admin", "coach"], // Multiple functional roles!
    roleSpecificData: {
      teams: ["U12 Boys"], // For coach role
    },
  },
});

// User accepts → Result:
// - Better Auth role: "admin" (can invite members, manage org settings)
// - Functional roles: ["admin", "coach"] (can access admin dashboard AND coach teams)
// - Coach assignments: ["U12 Boys"]
// - Redirect: /orgs/[orgId]/coach (priority: Coach > Admin)
```

#### Why This Approach Works

**1. Better Auth Metadata Support**

Better Auth's `inviteMember` API accepts a `metadata` field that:
- ✅ Is stored in the invitation record
- ✅ Is accessible in hooks (`onMemberAdded`, `afterInvitationAccepted`)
- ✅ Is preserved through the entire invitation lifecycle
- ✅ Can contain any JSON-serializable data

**2. Hook Execution Timing**

The `onMemberAdded` hook fires:
- ✅ **After** Better Auth creates the `member` record
- ✅ **Before** the user is redirected
- ✅ **Automatically** - no manual trigger needed
- ✅ **Reliably** - Better Auth guarantees hook execution

**3. Complete Automation**

This approach provides:
- ✅ **Zero manual steps**: Admin selects roles in UI, everything else is automatic
- ✅ **Immediate setup**: User has functional roles as soon as they accept
- ✅ **Consistent**: Same process for all invitations
- ✅ **Flexible**: Can add more metadata fields as needed

**4. UI Enhancement Benefits**

Adding functional role selection to invitation UI:
- ✅ **Better UX**: Admin can set everything upfront
- ✅ **Faster onboarding**: User doesn't need manual role assignment
- ✅ **Less errors**: No chance of forgetting to assign roles
- ✅ **Multi-role support**: Can invite as both coach AND parent in one step

#### Current Limitation & Solution

**Current State**:
- ❌ Invitation UI only sets Better Auth role
- ❌ Functional roles must be assigned manually after acceptance
- ❌ Parent-player linking must be done manually
- ❌ Coach assignments must be done manually

**Solution**:
- ✅ Enhance invitation UI to include functional role checkboxes
- ✅ Store functional roles in invitation metadata
- ✅ Hook auto-assigns functional roles on acceptance
- ✅ Hook auto-links parent to players (if parent role)
- ✅ Hook auto-creates coach assignments (if coach role)

**Implementation**:
- Update invitation dialog UI (Phase 1.4)
- Implement `onMemberAdded` hook (Phase 1.2)
- Add helper mutations for role assignment and linking (Phase 1.2)

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

#### 1.3 Enhance Join Request System
**Goal**: Add role-specific data collection and multi-role support

**Changes**:
- Update `orgJoinRequests` schema to include:
  - `requestedFunctionalRoles`: Array of functional roles
  - `roleSpecificData`: Object with teams, ageGroups, children, etc.
- Update `createJoinRequest` mutation to accept role-specific data
- Update join request UI to collect role-specific data

**Files**:
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/models/orgJoinRequests.ts`
- `apps/web/src/app/orgs/join/[orgId]/page.tsx`

#### 1.4 Update Invitation UI with Functional Role Selection
**Goal**: Allow selecting functional roles during invitation for automatic assignment

**Why This Works**:
- Better Auth's `inviteMember` API supports `metadata` field
- Metadata is stored in invitation record and accessible in hooks
- `onMemberAdded` hook can read metadata and auto-assign functional roles
- **Result**: Zero manual steps - fully automated role assignment

**Current State**:
- ❌ Invitation UI only sets Better Auth role (member/admin)
- ❌ Functional roles must be assigned manually after user accepts
- ❌ Parent-player linking must be done manually
- ❌ Coach assignments must be done manually

**Changes**:
- **Update Invitation Dialog UI**:
  - Add functional role checkboxes (Coach, Parent, Admin)
  - Show conditional fields based on selected roles:
    - If "Coach" selected: Team selector (multi-select)
    - If "Parent" selected: Player search/selector (optional, for specific children)
  - Update form state to track functional roles and role-specific data
- **Update Invitation Handler**:
  - Store functional roles in `metadata.suggestedFunctionalRoles`
  - Store role-specific data in `metadata.roleSpecificData`
  - Store player links in `metadata.suggestedPlayerLinks` (if parent)
  - Store team assignments in `metadata.roleSpecificData.teams` (if coach)
- **Validation**:
  - Ensure at least one functional role is selected (or Better Auth role is "admin")
  - If "Coach" selected, require at least one team (or allow empty for later assignment)
  - If "Parent" selected, player links are optional (auto-matching will run)

**Files**:
- `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (invitation dialog)

**Example UI Flow** (Simplified - Auto-Infer Better Auth Role):
```
Admin clicks "Invite Member"
  ↓
Dialog opens with:
  - Email input
  - Functional Roles (checkboxes):
    ☐ Coach
    ☐ Parent
    ☐ Admin
  - If Coach selected:
    - Teams: [Multi-select dropdown]
  - If Parent selected:
    - Link to specific players: [Search/Select players] (optional)
  ↓
Admin selects functional roles: ["coach", "parent"]
Admin fills form and clicks "Send Invitation"
  ↓
Backend auto-infers Better Auth role:
  - Functional roles: ["coach", "parent"] → Better Auth role = "member"
  ↓
Invitation sent with:
  - role: "member" (auto-inferred)
  - metadata: {
      suggestedFunctionalRoles: ["coach", "parent"],
      roleSpecificData: { teams: ["U12 Boys"] },
      suggestedPlayerLinks: ["playerId1"]
    }
  ↓
User accepts invitation
  ↓
onMemberAdded hook fires automatically
  ↓
Hook reads metadata and auto-assigns:
  - Functional roles: ["coach", "parent"]
  - Coach assignments: teams ["U12 Boys"]
  - Parent-player links: ["playerId1"] + auto-matched players
  ↓
User is fully set up - zero manual steps!
```

**Alternative Example** (Admin Functional Role):
```
Admin selects functional role: ["admin"]
  ↓
Backend auto-infers Better Auth role:
  - Functional role: ["admin"] → Better Auth role = "admin"
  ↓
Invitation sent with:
  - role: "admin" (auto-inferred)
  - metadata: { suggestedFunctionalRoles: ["admin"] }
  ↓
User accepts → Better Auth role: "admin", Functional role: ["admin"]
```

**Benefits**:
- ✅ **Faster onboarding**: User has roles immediately after acceptance
- ✅ **Less admin work**: No manual role assignment needed
- ✅ **Fewer errors**: Can't forget to assign roles
- ✅ **Multi-role support**: Can invite as both coach AND parent in one step
- ✅ **Consistent**: Same automated process for all invitations

### Phase 2: Smart Matching & Enhanced Approval (Week 2-3)

#### 2.1 Implement Smart Matching for Parents
**Goal**: Auto-match parents to players based on multiple criteria

**Changes**:
- Add `getSmartMatchesForParent` query (from MVP)
- Match criteria: email, surname, phone, address (postcode/town), children names
- Return confidence scores (high/medium/low)
- Return match reasons for transparency

**Files**:
- `packages/backend/convex/models/players.ts`
- `packages/backend/convex/models/orgJoinRequests.ts`

#### 2.2 Enhance Approval Dashboard
**Goal**: Admin can configure role assignments during approval

**Changes**:
- Update approval UI to show:
  - Requested roles (badges)
  - Role-specific data
  - Smart matches for parents (with confidence scores)
  - Role configuration options (teams for coaches, players for parents)
- Update `approveJoinRequest` mutation to:
  - Accept role configuration (teams, linked players)
  - Assign functional roles
  - Link parent to players
  - Create coach assignments

**Files**:
- `apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx`
- `packages/backend/convex/models/orgJoinRequests.ts`

#### 2.3 Add Status Screens
**Goal**: Show pending/rejected status for join requests

**Changes**:
- Add pending status indicator on `/orgs` page
- Add rejected status screen (if request rejected)
- Block organization access until approved

**Files**:
- `apps/web/src/app/orgs/page.tsx`
- `apps/web/src/components/join-request-status.tsx`

### Phase 3: Parent-Player Auto-Linking (Week 3-4)

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

### Phase 4: Access Control Updates (Week 4-5)

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

### Phase 5: Testing & Refinement (Week 5-6)

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

### 5.3 Enhanced Join Request Form

```typescript
// apps/web/src/app/orgs/join/[orgId]/page.tsx

// Enhanced form with multi-role selection and role-specific data
const [selectedRoles, setSelectedRoles] = useState<FunctionalRole[]>([]);
const [roleData, setRoleData] = useState({
  coach: {
    sport: "",
    teams: [] as string[],
    ageGroups: [] as string[],
  },
  parent: {
    email: userEmail, // Auto-filled
    address: "",
    children: [] as Array<{ name: string; age: string }>,
  },
});

const handleSubmit = async () => {
  await createJoinRequest({
    organizationId: orgId,
    requestedRole: selectedRoles[0] || "member", // Primary role for Better Auth
    requestedFunctionalRoles: selectedRoles,
    roleSpecificData: {
      coach: selectedRoles.includes("coach") ? roleData.coach : undefined,
      parent: selectedRoles.includes("parent") ? roleData.parent : undefined,
    },
    message: optionalMessage,
  });
};
```

### 5.4 Smart Matching Query

```typescript
// packages/backend/convex/models/players.ts

/**
 * Get smart matches for a parent based on multiple criteria
 * Returns players with confidence scores and match reasons
 */
export const getSmartMatchesForParent = query({
  args: {
    organizationId: v.string(),
    email: v.optional(v.string()),
    surname: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    town: v.optional(v.string()),
    children: v.optional(v.array(v.string())), // Children names
  },
  returns: v.array(v.object({
    _id: v.id("players"),
    name: v.string(),
    team: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    matchScore: v.number(), // 0-100
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    matchReasons: v.array(v.string()), // ["email", "surname", "phone", etc.]
  })),
  handler: async (ctx, args) => {
    // Get all players in organization
    const orgPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    
    const matches = [];
    
    for (const player of orgPlayers) {
      let score = 0;
      const reasons: string[] = [];
      
      // Email matching (40 points)
      if (args.email && player.parentEmail) {
        if (player.parentEmail.toLowerCase().trim() === args.email.toLowerCase().trim()) {
          score += 40;
          reasons.push("email");
        }
      }
      
      // Surname matching (20 points)
      if (args.surname && player.parentSurname) {
        if (player.parentSurname.toLowerCase().trim() === args.surname.toLowerCase().trim()) {
          score += 20;
          reasons.push("surname");
        }
      }
      
      // Phone matching (15 points)
      if (args.phone && player.parentPhone) {
        if (normalizePhone(player.parentPhone) === normalizePhone(args.phone)) {
          score += 15;
          reasons.push("phone");
        }
      }
      
      // Postcode matching (10 points)
      if (args.postcode && player.postcode) {
        if (player.postcode.toLowerCase().trim() === args.postcode.toLowerCase().trim()) {
          score += 10;
          reasons.push("postcode");
        }
      }
      
      // Town matching (5 points)
      if (args.town && player.town) {
        if (player.town.toLowerCase().trim() === args.town.toLowerCase().trim()) {
          score += 5;
          reasons.push("town");
        }
      }
      
      // Children names matching (10 points per match)
      if (args.children && args.children.length > 0 && player.name) {
        for (const childName of args.children) {
          if (player.name.toLowerCase().includes(childName.toLowerCase())) {
            score += 10;
            reasons.push("childName");
          }
        }
      }
      
      // Only include matches with score > 0
      if (score > 0) {
        matches.push({
          _id: player._id,
          name: player.name,
          team: player.team || "",
          ageGroup: player.ageGroup,
          sport: player.sport,
          matchScore: Math.min(score, 100), // Cap at 100
          confidence: score >= 50 ? "high" : score >= 25 ? "medium" : "low",
          matchReasons: reasons,
        });
      }
    }
    
    // Sort by score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  },
});
```

### 5.5 Enhanced Approval Dashboard UI

```typescript
// apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx

// Enhanced approval card with role configuration
function ApprovalCard({ request }: { request: any }) {
  const [roleConfig, setRoleConfig] = useState({
    coach: { teams: [], ageGroups: [] },
    parent: { linkedPlayers: [] },
  });
  
  // Get smart matches for parent role
  const smartMatches = useQuery(
    api.models.players.getSmartMatchesForParent,
    request.requestedFunctionalRoles?.includes("parent")
      ? {
          organizationId: request.organizationId,
          email: request.userEmail,
          // ... other parent data from roleSpecificData
        }
      : "skip"
  );
  
  const handleApprove = async () => {
    await approveJoinRequest({
      requestId: request._id,
      roleConfiguration: {
        functionalRoles: request.requestedFunctionalRoles,
        coach: roleConfig.coach,
        parent: roleConfig.parent,
      },
    });
  };
  
  return (
    <Card>
      {/* Request details */}
      {/* Role configuration UI */}
      {/* Smart matches for parent */}
      {/* Approve/Reject buttons */}
    </Card>
  );
}
```

### 5.6 Enhanced Invitation UI

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

## 12. Future Feature Analysis: Cross-Organization Passport Sharing

### 12.1 Feature Overview

**Goal**: Enable parents to authorize sharing of player passport data from one organization to another, allowing coaches to see a holistic view of player development across multiple sports/organizations.

**Use Case Example**:
- Player "John" plays **Soccer** in Organization A (Grange GFC)
- Player "John" also plays **Rugby** in Organization B (Local Rugby Club)
- Parent authorizes sharing: Soccer passport → Rugby organization
- Rugby coach can see John's soccer development data to inform training plans
- Provides **single view of player development** across sports

**Benefits**:
- ✅ Coaches get holistic view of player's development
- ✅ Better-informed training plans (understand player's strengths/weaknesses across sports)
- ✅ Prevents overtraining (see training load across sports)
- ✅ Injury prevention (see injury history across sports)
- ✅ Parent-controlled: Parents decide what to share and with whom

### 12.2 Current Architecture Implications

#### Current State

**Player Passport Scope**:
- ✅ Player passports are **organization-scoped**
- ✅ Each organization has its own player records
- ✅ Passport data is isolated per organization
- ✅ No cross-organization data sharing currently exists

**Access Control**:
- ✅ Coaches can only see players in their organization
- ✅ Parents can only see children in organizations they're members of
- ✅ No mechanism for cross-organization data access

#### Required Changes

**1. Consent/Authorization System**

**New Schema**:
```typescript
// New table: passportSharingAuthorizations
passportSharingAuthorizations: defineTable({
  playerId: v.id("players"), // Player in source organization
  sourceOrganizationId: v.string(), // Where player currently is
  targetOrganizationId: v.string(), // Where data should be shared
  authorizedBy: v.string(), // Parent user ID who authorized
  authorizedAt: v.number(), // Timestamp
  status: v.union(
    v.literal("pending"), // Parent needs to approve
    v.literal("active"), // Sharing is active
    v.literal("revoked") // Parent revoked sharing
  ),
  sharedData: v.array(v.string()), // What data to share: ["skills", "goals", "injuries", "attendance"]
  expiresAt: v.optional(v.number()), // Optional expiration
})
  .index("by_playerId", ["playerId"])
  .index("by_targetOrganizationId", ["targetOrganizationId"])
  .index("by_sourceOrganizationId", ["sourceOrganizationId"])
  .index("by_authorizedBy", ["authorizedBy"])
```

**2. Parent Authorization UI**

**Location**: `/orgs/[orgId]/parents/[playerId]/sharing`

**Features**:
- List of organizations where player is also a member
- Toggle switches for each organization:
  - ☐ Share with [Organization Name]
  - ☐ Share skills data
  - ☐ Share goals data
  - ☐ Share injury history
  - ☐ Share attendance data
- Granular control: Parent chooses what data to share
- Revocation: Parent can revoke sharing at any time

**3. Coach View Enhancement**

**Location**: `/orgs/[orgId]/players/[playerId]` (existing passport page)

**Features**:
- **"Shared Passport Data"** section (if parent authorized sharing)
- Shows data from other organizations:
  - Skills from other sports
  - Goals from other sports
  - Injury history across all sports
  - Training load across all sports
- Clear indicators: "Data from [Organization Name]"
- Timestamp: "Last updated [date]"

**4. Access Control Updates**

**New Permission Checks**:
```typescript
function canViewSharedPassportData(
  coachUserId: string,
  playerId: string,
  sourceOrgId: string,
  targetOrgId: string
): boolean {
  // 1. Check if parent authorized sharing
  const authorization = getPassportSharingAuthorization(
    playerId,
    sourceOrgId,
    targetOrgId
  );
  
  if (!authorization || authorization.status !== "active") {
    return false;
  }
  
  // 2. Check if coach is in target organization
  const coachMember = getMember(coachUserId, targetOrgId);
  if (!coachMember) {
    return false;
  }
  
  // 3. Check if coach has functional role "coach"
  if (!coachMember.functionalRoles?.includes("coach")) {
    return false;
  }
  
  // 4. Check if coach is assigned to player's team (in target org)
  const playerInTargetOrg = getPlayerInOrg(playerId, targetOrgId);
  const coachTeams = getCoachTeams(coachUserId, targetOrgId);
  
  return playerInTargetOrg.teams.some(teamId => 
    coachTeams.includes(teamId)
  );
}
```

### 12.3 Technical Implementation Considerations

#### Data Structure

**Shared Passport View**:
```typescript
interface SharedPassportData {
  sourceOrganization: {
    id: string;
    name: string;
    sport: string;
  };
  sharedData: {
    skills?: Record<string, number>; // If parent authorized
    goals?: Array<Goal>; // If parent authorized
    injuries?: Array<Injury>; // If parent authorized
    attendance?: AttendanceData; // If parent authorized
  };
  lastUpdated: number;
  authorizedBy: string; // Parent name
  authorizedAt: number;
}
```

**Player Passport with Shared Data**:
```typescript
interface PlayerPassportWithShared {
  // Current org data (always visible)
  currentOrg: {
    organizationId: string;
    organizationName: string;
    sport: string;
    skills: Record<string, number>;
    goals: Array<Goal>;
    injuries: Array<Injury>;
    attendance: AttendanceData;
  };
  
  // Shared data from other orgs (if authorized)
  sharedFromOtherOrgs: Array<SharedPassportData>;
}
```

#### Backend Queries

**New Query: `getSharedPassportData`**
```typescript
export const getSharedPassportData = query({
  args: {
    playerId: v.id("players"), // Player in current org
    organizationId: v.string(), // Current organization
  },
  returns: v.array(v.object({
    sourceOrganization: v.object({
      id: v.string(),
      name: v.string(),
      sport: v.string(),
    }),
    sharedData: v.any(), // Filtered based on authorization
    lastUpdated: v.number(),
  })),
  handler: async (ctx, args) => {
    // 1. Get all active sharing authorizations for this player
    const authorizations = await ctx.db
      .query("passportSharingAuthorizations")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .filter((q) => 
        q.and(
          q.eq(q.field("targetOrganizationId"), args.organizationId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();
    
    // 2. For each authorization, fetch shared data from source org
    const sharedData = [];
    for (const auth of authorizations) {
      const sourcePlayer = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", auth.sourceOrganizationId)
        )
        .filter((q) => {
          // Match player by name, email, or other identifier
          // (players might have different IDs in different orgs)
          return q.eq(q.field("name"), playerName); // Simplified
        })
        .first();
      
      if (sourcePlayer) {
        // Filter data based on authorization.sharedData array
        const filteredData = {
          skills: auth.sharedData.includes("skills") ? sourcePlayer.skills : undefined,
          goals: auth.sharedData.includes("goals") ? sourcePlayer.actions : undefined,
          injuries: auth.sharedData.includes("injuries") ? sourcePlayer.injuries : undefined,
          attendance: auth.sharedData.includes("attendance") ? sourcePlayer.attendance : undefined,
        };
        
        sharedData.push({
          sourceOrganization: {
            id: auth.sourceOrganizationId,
            name: await getOrgName(auth.sourceOrganizationId),
            sport: sourcePlayer.sport,
          },
          sharedData: filteredData,
          lastUpdated: sourcePlayer._creationTime,
        });
      }
    }
    
    return sharedData;
  },
});
```

#### Player Matching Across Organizations

**Challenge**: A player might have different records in different organizations (different `_id` values).

**Solutions**:

**Option A: Email-Based Matching** (Recommended)
- Match players by parent email across organizations
- Parent email is consistent across orgs
- Simple and reliable

**Option B: Player Name + DOB Matching**
- Match by name and date of birth
- More complex but handles email changes

**Option C: Explicit Linking**
- Parent manually links player records across orgs
- Most control, but more work for parent

**Recommended**: Start with Option A (email-based), add Option C (explicit linking) as enhancement.

### 12.4 Privacy & Consent Considerations

#### Parent Control

**Granular Permissions**:
- ✅ Parent chooses **which organizations** to share with
- ✅ Parent chooses **what data** to share (skills, goals, injuries, attendance)
- ✅ Parent can **revoke** sharing at any time
- ✅ Parent can set **expiration dates** for sharing

**Default Behavior**:
- ❌ **No sharing by default** - opt-in only
- ❌ **No automatic sharing** - parent must explicitly authorize
- ✅ **Clear UI** - parent understands what they're sharing

#### Coach Access

**Restrictions**:
- ✅ Coach can only see shared data if:
  - Parent explicitly authorized sharing
  - Coach is in the target organization
  - Coach has functional role "coach"
  - Coach is assigned to player's team
- ❌ Coach cannot see data from organizations where they're not a member
- ❌ Coach cannot see data if parent revoked sharing

#### Audit Trail

**Logging**:
- Log when parent authorizes sharing
- Log when parent revokes sharing
- Log when coach views shared data
- Log what data was viewed

### 12.5 UI/UX Considerations

#### Parent Authorization UI

**Location**: `/orgs/[orgId]/parents/[playerId]/sharing`

**Design**:
```
┌─────────────────────────────────────────┐
│ Share [Player Name]'s Passport Data     │
├─────────────────────────────────────────┤
│                                         │
│ Other Organizations:                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Local Rugby Club                  │ │
│ │   Sport: Rugby                       │ │
│ │   ┌───────────────────────────────┐ │ │
│ │   │ ☑ Share Skills Data          │ │ │
│ │   │ ☑ Share Goals Data            │ │ │
│ │   │ ☐ Share Injury History        │ │ │
│ │   │ ☑ Share Attendance Data       │ │ │
│ │   └───────────────────────────────┘ │ │
│ │   [Revoke Sharing]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ☐ Basketball Academy                 │ │
│ │   Sport: Basketball                  │ │
│ │   [Enable Sharing]                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Save Changes]                          │
└─────────────────────────────────────────┘
```

#### Coach View Enhancement

**Location**: `/orgs/[orgId]/players/[playerId]` (existing passport)

**Design**:
```
┌─────────────────────────────────────────┐
│ Player Passport: John Doe               │
├─────────────────────────────────────────┤
│                                         │
│ [Current Organization Data]              │
│ Skills, Goals, Injuries, etc.            │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ 📊 Shared Passport Data                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Data from: Local Rugby Club          │ │
│ │ Sport: Rugby                         │ │
│ │ Authorized by: Parent Name           │ │
│ │                                     │ │
│ │ Skills (Rugby):                      │ │
│ │ - Passing: 4/5                      │ │
│ │ - Tackling: 3/5                     │ │
│ │                                     │ │
│ │ Goals:                              │ │
│ │ - Improve defensive positioning     │ │
│ │                                     │ │
│ │ Last updated: 2 weeks ago           │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 12.6 Implementation Phases

#### Phase 1: Foundation (Future)
- Create `passportSharingAuthorizations` table
- Add parent authorization UI
- Add backend queries for shared data
- Add access control checks

#### Phase 2: Coach View (Future)
- Enhance player passport page to show shared data
- Add visual indicators for shared vs. current org data
- Add filtering/sorting for shared data

#### Phase 3: Advanced Features (Future)
- Player matching across organizations (email-based)
- Explicit player linking (parent manually links)
- Sharing analytics (who viewed what, when)
- Bulk sharing (share with multiple orgs at once)

### 12.7 Open Questions

**Q1**: How do we match players across organizations?
- **Recommendation**: Start with email-based matching, add explicit linking later

**Q2**: Should sharing be one-way or bidirectional?
- **Recommendation**: One-way initially (Org A → Org B), bidirectional as enhancement

**Q3**: Should there be a time limit on sharing?
- **Recommendation**: Optional expiration date, default to no expiration

**Q4**: What happens if parent removes player from source organization?
- **Recommendation**: Sharing automatically revoked, coach sees "data no longer available"

**Q5**: Should coaches be notified when new shared data is available?
- **Recommendation**: Optional notification, but not required initially

**Q6**: How do we handle data conflicts (same skill rated differently in different orgs)?
- **Recommendation**: Show both ratings with org context, let coach interpret

### 12.8 Integration with Current Architecture

#### How It Fits

**Parent Role**:
- ✅ Parents control sharing (fits with parent role responsibilities)
- ✅ Parents can authorize/revoke from parent dashboard
- ✅ Parents see what data is being shared

**Coach Role**:
- ✅ Coaches can view shared data (if authorized)
- ✅ Coaches get holistic view of player development
- ✅ Coaches can use shared data to inform training plans

**Player Passport**:
- ✅ Existing passport structure supports shared data
- ✅ Can add "Shared Data" section to existing passport page
- ✅ No major restructuring needed

**Access Control**:
- ✅ Uses existing functional role checks
- ✅ Uses existing organization membership checks
- ✅ Adds new authorization check (parent consent)

### 12.9 Success Criteria

- [ ] Parent can authorize sharing from parent dashboard
- [ ] Parent can choose what data to share (granular control)
- [ ] Parent can revoke sharing at any time
- [ ] Coach can see shared data in player passport (if authorized)
- [ ] Coach can only see data if assigned to player's team
- [ ] Access control correctly enforces parent authorization
- [ ] Player matching works across organizations
- [ ] UI clearly indicates shared vs. current org data
- [ ] Audit trail logs all sharing actions

---

## 13. Future Feature Analysis: Knowledge Graph & Semantic Insights

### 13.1 Feature Overview

**Goal**: Augment PlayerARC with a knowledge graph and/or semantic graph to enable advanced insights, pattern recognition, and intelligent recommendations across the entire player development ecosystem.

**What is a Knowledge Graph?**
A knowledge graph is a structured representation of entities (players, coaches, teams, etc.) and their relationships (coaches, plays_for, has_skill, etc.) that enables:
- **Semantic search**: Find players with similar skill profiles
- **Pattern recognition**: Identify development patterns across players
- **Relationship discovery**: Understand connections between entities
- **Insight generation**: Generate actionable insights from data relationships
- **Recommendation systems**: Suggest training plans, player comparisons, etc.

**What is a Semantic Graph?**
A semantic graph adds meaning and context to relationships:
- **Typed relationships**: "coaches" vs "assists" vs "manages"
- **Weighted relationships**: Strength of connection (e.g., primary coach vs. assistant)
- **Temporal relationships**: How relationships change over time
- **Contextual relationships**: Relationships within specific contexts (sport, age group, etc.)

### 13.2 Current Data Relationships

#### Existing Entity Relationships

**Players**:
- ✅ `organizationId` → Organization (many-to-one)
- ✅ `parents[]` → Parent users (many-to-many via email)
- ✅ `teamPlayers` → Teams (many-to-many via junction table)
- ✅ `coachAssignments` → Coaches (indirect via teams)
- ✅ Skills, goals, injuries, attendance (attributes)

**Coaches**:
- ✅ `organizationId` → Organization (many-to-one)
- ✅ `coachAssignments.teams` → Teams (many-to-many)
- ✅ `coachAssignments.teams` → Players (indirect via teams)

**Parents**:
- ✅ `organizationId` → Organization (many-to-one)
- ✅ `players.parents[].email` → Players (many-to-many via email)
- ✅ Can be in multiple organizations

**Teams**:
- ✅ `organizationId` → Organization (many-to-one)
- ✅ `teamPlayers` → Players (many-to-many)
- ✅ `coachAssignments` → Coaches (many-to-many)

**Organizations**:
- ✅ `members` → Users (many-to-many via Better Auth)
- ✅ `players` → Players (one-to-many)
- ✅ `teams` → Teams (one-to-many)

#### Missing Relationships

**Current Limitations**:
- ❌ No explicit "similar players" relationships
- ❌ No "development patterns" relationships
- ❌ No "skill progression" temporal relationships
- ❌ No "coach effectiveness" relationships
- ❌ No "team dynamics" relationships
- ❌ No semantic meaning to relationships (all are implicit)

### 13.3 Knowledge Graph Structure

#### Entity Types

```typescript
interface KnowledgeGraphEntity {
  id: string;
  type: "player" | "coach" | "parent" | "team" | "organization" | "skill" | "goal" | "injury";
  properties: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

#### Relationship Types

```typescript
interface KnowledgeGraphRelationship {
  id: string;
  source: string; // Entity ID
  target: string; // Entity ID
  type: RelationshipType;
  weight?: number; // 0-1, strength of relationship
  context?: {
    organizationId?: string;
    sport?: string;
    ageGroup?: string;
    timeRange?: { start: number; end: number };
  };
  metadata?: Record<string, any>;
  createdAt: number;
}

type RelationshipType =
  // Direct relationships
  | "coaches" // Coach → Player
  | "parent_of" // Parent → Player
  | "plays_for" // Player → Team
  | "manages" // Coach → Team
  | "member_of" // User → Organization
  
  // Skill relationships
  | "has_skill" // Player → Skill (with rating)
  | "excels_at" // Player → Skill (rating >= 4)
  | "needs_improvement_in" // Player → Skill (rating <= 2)
  | "skill_progression" // Player → Skill (temporal, tracks improvement)
  
  // Development relationships
  | "has_goal" // Player → Goal
  | "goal_related_to_skill" // Goal → Skill
  | "similar_skill_profile" // Player → Player (similarity score)
  | "similar_development_path" // Player → Player (temporal similarity)
  
  // Team relationships
  | "teammate_of" // Player → Player (same team)
  | "coached_by_same" // Player → Player (same coach)
  | "plays_same_sport" // Player → Player (same sport)
  
  // Coach relationships
  | "coaches_similar_players" // Coach → Coach (similar player profiles)
  | "coach_effectiveness" // Coach → Skill (improvement rate)
  
  // Cross-organization relationships
  | "shares_passport_data" // Player → Player (cross-org sharing)
  | "multi_sport_athlete" // Player → Player (different sports, same person)
  
  // Temporal relationships
  | "preceded_by" // Player state → Player state (temporal)
  | "followed_by" // Player state → Player state (temporal)
  | "improved_from" // Skill rating → Skill rating (temporal)
```

### 13.4 Use Cases & Insights

#### 1. Player Similarity & Recommendations

**Use Case**: "Find players similar to John who improved their passing skills"

**Graph Query**:
```
Find players where:
- has_skill("passing") with rating < 3
- similar_skill_profile to John (similarity > 0.7)
- skill_progression("passing") shows improvement
- Return: training plans that worked for similar players
```

**Insights Generated**:
- Players with similar profiles who improved
- Training plans that were effective
- Time to improvement (average)
- Common challenges and solutions

#### 2. Coach Effectiveness Analysis

**Use Case**: "Which coaches are most effective at developing specific skills?"

**Graph Query**:
```
For each coach:
- Find all players they coach
- Track skill_progression for each skill
- Calculate improvement rate per skill
- Rank coaches by improvement rate
```

**Insights Generated**:
- Coach effectiveness by skill type
- Coaches who excel at specific skill development
- Best practices from top-performing coaches
- Skill-specific coaching recommendations

#### 3. Development Pattern Recognition

**Use Case**: "Identify common development patterns for U12 soccer players"

**Graph Query**:
```
Find all U12 soccer players:
- Extract skill progression patterns
- Extract goal achievement patterns
- Extract injury patterns
- Cluster similar development paths
```

**Insights Generated**:
- Common skill development sequences
- Typical goal achievement timelines
- Injury risk patterns
- Optimal training progression paths

#### 4. Team Dynamics & Chemistry

**Use Case**: "Understand team dynamics and player relationships"

**Graph Query**:
```
For a team:
- Find all players (teammate_of relationships)
- Find shared coaches (coached_by_same)
- Find skill complementarity (players with complementary skills)
- Find development synchrony (players improving together)
```

**Insights Generated**:
- Team skill balance
- Player chemistry indicators
- Optimal team compositions
- Development synchronization opportunities

#### 5. Cross-Sport Development Insights

**Use Case**: "How does rugby experience affect soccer development?"

**Graph Query**:
```
Find players who:
- plays_same_sport("soccer") in Org A
- plays_same_sport("rugby") in Org B
- shares_passport_data between orgs
- Compare skill development across sports
```

**Insights Generated**:
- Skill transfer between sports
- Cross-sport development benefits
- Optimal multi-sport training schedules
- Sport-specific skill correlations

#### 6. Parent Engagement Impact

**Use Case**: "How does parent engagement affect player development?"

**Graph Query**:
```
For each parent:
- Find all children (parent_of relationships)
- Track children's skill_progression
- Track goal achievement rates
- Compare engaged vs. less engaged parents
```

**Insights Generated**:
- Parent engagement impact on development
- Effective parent involvement strategies
- Optimal parent-coach communication patterns
- Parent support recommendations

### 13.5 Technical Implementation

#### Option A: Graph Database (Recommended for Scale)

**Technology**: Neo4j, Amazon Neptune, or ArangoDB

**Structure**:
- Nodes: Players, Coaches, Teams, Skills, Goals, etc.
- Edges: Relationships with properties (weight, context, metadata)
- Indexes: Fast traversal and pattern matching

**Pros**:
- ✅ Native graph operations (Cypher queries)
- ✅ Efficient relationship traversal
- ✅ Built-in pattern matching
- ✅ Scales to large datasets

**Cons**:
- ❌ Additional infrastructure
- ❌ Data synchronization with Convex
- ❌ More complex architecture

#### Option B: Graph Layer on Convex (Recommended Initially)

**Technology**: Build graph structure in Convex using existing tables

**Structure**:
- New table: `knowledgeGraphRelationships`
- Queries compute graph relationships on-the-fly
- Cached relationships for performance

**Pros**:
- ✅ No additional infrastructure
- ✅ Uses existing Convex architecture
- ✅ Real-time updates
- ✅ Simpler to implement

**Cons**:
- ❌ May be slower for complex queries
- ❌ Limited to Convex query capabilities
- ❌ May need optimization for large datasets

**Recommended**: Start with Option B, migrate to Option A if needed.

#### Implementation Structure

**New Schema**:
```typescript
// packages/backend/convex/schema.ts

knowledgeGraphRelationships: defineTable({
  sourceId: v.string(), // Entity ID (player, coach, etc.)
  sourceType: v.union(
    v.literal("player"),
    v.literal("coach"),
    v.literal("parent"),
    v.literal("team"),
    v.literal("organization"),
    v.literal("skill"),
    v.literal("goal")
  ),
  targetId: v.string(), // Entity ID
  targetType: v.union(
    v.literal("player"),
    v.literal("coach"),
    v.literal("parent"),
    v.literal("team"),
    v.literal("organization"),
    v.literal("skill"),
    v.literal("goal")
  ),
  relationshipType: v.string(), // "coaches", "similar_skill_profile", etc.
  weight: v.optional(v.number()), // 0-1, strength of relationship
  context: v.optional(v.object({
    organizationId: v.optional(v.string()),
    sport: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  })),
  metadata: v.optional(v.any()), // Additional relationship data
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_source", ["sourceId", "sourceType"])
  .index("by_target", ["targetId", "targetType"])
  .index("by_relationshipType", ["relationshipType"])
  .index("by_source_and_type", ["sourceId", "relationshipType"])
  .index("by_context", ["context.organizationId"])
```

### 13.6 Relationship Generation Strategies

#### 1. Explicit Relationships (Manual)

**When**: Relationships that require human input
- Parent-child relationships (already exist)
- Coach-team assignments (already exist)
- Team-player memberships (already exist)

**Implementation**: Use existing data, no changes needed.

#### 2. Computed Relationships (Automatic)

**When**: Relationships that can be calculated from data

**Examples**:

**Similar Skill Profile**:
```typescript
// Calculate similarity between players based on skill ratings
function calculateSkillSimilarity(player1: Player, player2: Player): number {
  const skills1 = player1.skills;
  const skills2 = player2.skills;
  
  // Cosine similarity or other metric
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const skill in skills1) {
    if (skills2[skill]) {
      dotProduct += skills1[skill] * skills2[skill];
      norm1 += skills1[skill] ** 2;
      norm2 += skills2[skill] ** 2;
    }
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Create relationship if similarity > threshold
if (similarity > 0.7) {
  createRelationship({
    source: player1._id,
    target: player2._id,
    type: "similar_skill_profile",
    weight: similarity,
  });
}
```

**Skill Progression**:
```typescript
// Track skill improvement over time
function trackSkillProgression(playerId: string, skill: string) {
  const skillHistory = getSkillHistory(playerId, skill);
  
  if (skillHistory.length >= 2) {
    const improvement = skillHistory[skillHistory.length - 1] - skillHistory[0];
    
    if (improvement > 0) {
      createRelationship({
        source: playerId,
        target: skill,
        type: "skill_progression",
        weight: improvement / 5, // Normalize to 0-1
        metadata: {
          improvement,
          timeRange: {
            start: skillHistory[0].timestamp,
            end: skillHistory[skillHistory.length - 1].timestamp,
          },
        },
      });
    }
  }
}
```

**Coach Effectiveness**:
```typescript
// Calculate coach effectiveness for specific skills
function calculateCoachEffectiveness(coachId: string, skill: string) {
  const players = getPlayersCoachedBy(coachId);
  const improvements = players.map(player => 
    getSkillImprovement(player._id, skill, coachStartDate)
  );
  
  const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
  
  createRelationship({
    source: coachId,
    target: skill,
    type: "coach_effectiveness",
    weight: avgImprovement / 5, // Normalize
    metadata: {
      playerCount: players.length,
      avgImprovement,
    },
  });
}
```

#### 3. Temporal Relationships (Time-Based)

**When**: Relationships that change over time

**Examples**:
- Skill progression over time
- Goal achievement timelines
- Team membership changes
- Coach assignment history

**Implementation**: Store relationship with time ranges, create new relationships as data changes.

### 13.7 Graph Query Examples

#### Query 1: Find Similar Players

```typescript
export const findSimilarPlayers = query({
  args: {
    playerId: v.id("players"),
    organizationId: v.string(),
    similarityThreshold: v.optional(v.number()), // Default 0.7
  },
  returns: v.array(v.object({
    player: v.any(),
    similarity: v.number(),
    sharedSkills: v.array(v.string()),
  })),
  handler: async (ctx, args) => {
    // Get target player
    const targetPlayer = await ctx.db.get(args.playerId);
    if (!targetPlayer) return [];
    
    // Find similar skill profile relationships
    const similarRelationships = await ctx.db
      .query("knowledgeGraphRelationships")
      .withIndex("by_source_and_type", (q) =>
        q.eq("sourceId", args.playerId)
         .eq("relationshipType", "similar_skill_profile")
      )
      .filter((q) => 
        q.gte(q.field("weight"), args.similarityThreshold || 0.7)
      )
      .collect();
    
    // Get similar players
    const similarPlayers = await Promise.all(
      similarRelationships.map(async (rel) => {
        const player = await ctx.db.get(rel.targetId as any);
        return {
          player,
          similarity: rel.weight || 0,
          sharedSkills: rel.metadata?.sharedSkills || [],
        };
      })
    );
    
    return similarPlayers.filter(p => p.player !== null);
  },
});
```

#### Query 2: Get Development Insights

```typescript
export const getDevelopmentInsights = query({
  args: {
    playerId: v.id("players"),
    organizationId: v.string(),
  },
  returns: v.object({
    skillProgression: v.array(v.any()),
    similarPlayers: v.array(v.any()),
    coachEffectiveness: v.any(),
    recommendedGoals: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    // Get skill progression relationships
    const skillProgression = await ctx.db
      .query("knowledgeGraphRelationships")
      .withIndex("by_source_and_type", (q) =>
        q.eq("sourceId", args.playerId)
         .eq("relationshipType", "skill_progression")
      )
      .collect();
    
    // Get similar players
    const similarPlayers = await findSimilarPlayers(ctx, {
      playerId: args.playerId,
      organizationId: args.organizationId,
    });
    
    // Get coach effectiveness for player's coaches
    const coaches = await getPlayerCoaches(ctx, args.playerId);
    const coachEffectiveness = await Promise.all(
      coaches.map(coach => 
        getCoachEffectivenessForSkills(ctx, coach._id, args.organizationId)
      )
    );
    
    // Generate recommended goals based on similar players
    const recommendedGoals = await generateGoalRecommendations(
      ctx,
      args.playerId,
      similarPlayers
    );
    
    return {
      skillProgression,
      similarPlayers,
      coachEffectiveness,
      recommendedGoals,
    };
  },
});
```

### 13.8 UI Integration

#### Coach Dashboard Insights Panel

**Location**: `/orgs/[orgId]/coach` (new section)

**Features**:
- **Similar Players**: "Players with similar skill profiles"
- **Development Patterns**: "Common development paths for U12 players"
- **Coach Effectiveness**: "Your effectiveness by skill type"
- **Team Insights**: "Team skill balance and chemistry"

#### Player Passport Insights

**Location**: `/orgs/[orgId]/players/[playerId]` (new section)

**Features**:
- **Similar Players**: "Players with similar profiles"
- **Development Trajectory**: "Your skill progression over time"
- **Goal Recommendations**: "Goals achieved by similar players"
- **Cross-Sport Insights**: "How your [other sport] experience helps here"

#### Parent Dashboard Insights

**Location**: `/orgs/[orgId]/parents` (new section)

**Features**:
- **Development Comparison**: "How your child compares to similar players"
- **Engagement Impact**: "How your involvement affects development"
- **Multi-Sport Benefits**: "How playing multiple sports helps development"

### 13.9 Implementation Phases

#### Phase 1: Foundation (Future - Month 1-2)

**Goals**: Build basic graph structure and relationship generation

**Tasks**:
- Create `knowledgeGraphRelationships` table
- Implement explicit relationship extraction (from existing data)
- Implement computed relationship generation:
  - Similar skill profiles
  - Skill progression tracking
  - Teammate relationships
- Create basic graph queries

#### Phase 2: Insights Generation (Future - Month 2-3)

**Goals**: Generate actionable insights from graph

**Tasks**:
- Implement coach effectiveness calculations
- Implement development pattern recognition
- Implement goal recommendations
- Create insights API endpoints

#### Phase 3: UI Integration (Future - Month 3-4)

**Goals**: Surface insights in UI

**Tasks**:
- Add insights panel to coach dashboard
- Add insights section to player passport
- Add insights to parent dashboard
- Create visualization components (charts, graphs)

#### Phase 4: Advanced Features (Future - Month 4-6)

**Goals**: Advanced graph features

**Tasks**:
- Temporal relationship tracking
- Predictive insights (future development)
- Anomaly detection (unusual patterns)
- Recommendation engine

### 13.10 Benefits & Value Proposition

#### For Coaches

- ✅ **Better Training Plans**: See what works for similar players
- ✅ **Effectiveness Insights**: Understand your coaching strengths
- ✅ **Player Matching**: Find players with similar needs
- ✅ **Team Optimization**: Understand team dynamics

#### For Parents

- ✅ **Development Context**: See how child compares to peers
- ✅ **Engagement Impact**: Understand how involvement helps
- ✅ **Multi-Sport Benefits**: See cross-sport development effects
- ✅ **Goal Setting**: Get recommendations based on similar players

#### For Organizations

- ✅ **Program Effectiveness**: Understand what programs work
- ✅ **Resource Allocation**: Identify where to focus resources
- ✅ **Coach Development**: Help coaches improve
- ✅ **Player Retention**: Identify at-risk players early

### 13.11 Technical Considerations

#### Performance

**Challenges**:
- Graph queries can be expensive
- Relationship computation can be slow
- Real-time updates may be challenging

**Solutions**:
- Cache computed relationships
- Batch relationship updates
- Use background jobs for heavy computations
- Consider graph database for scale (Option A)

#### Data Quality

**Challenges**:
- Relationships depend on data quality
- Similarity calculations need good data
- Temporal relationships need historical data

**Solutions**:
- Data validation before relationship creation
- Confidence scores for relationships
- Handle missing data gracefully
- Start with high-confidence relationships

#### Privacy

**Challenges**:
- Graph reveals patterns that might be sensitive
- Similarity relationships might expose personal information
- Cross-organization insights need careful handling

**Solutions**:
- Aggregate insights (don't show individual comparisons without consent)
- Respect organization boundaries
- Allow parents to opt-out of similarity matching
- Anonymize data in insights

### 13.12 Open Questions

**Q1**: Should similarity matching be opt-in or opt-out?
- **Recommendation**: Opt-out by default, allow parents to enable

**Q2**: How do we handle cross-organization insights?
- **Recommendation**: Only if parent authorized passport sharing

**Q3**: Should insights be real-time or batch-processed?
- **Recommendation**: Batch-processed initially, real-time as enhancement

**Q4**: How do we measure relationship confidence?
- **Recommendation**: Use statistical measures (sample size, data quality)

**Q5**: Should we use a dedicated graph database?
- **Recommendation**: Start with Convex (Option B), migrate if needed

**Q6**: How do we handle graph updates as data changes?
- **Recommendation**: Incremental updates via background jobs

### 13.13 Integration with Current Architecture

#### How It Fits

**Existing Data**:
- ✅ Uses existing player, coach, parent, team data
- ✅ No schema changes to existing tables
- ✅ Adds new `knowledgeGraphRelationships` table

**Access Control**:
- ✅ Uses existing functional role checks
- ✅ Uses existing organization membership checks
- ✅ Respects parent consent for cross-org insights

**Player Passport**:
- ✅ Enhances existing passport with insights
- ✅ Adds new "Insights" section
- ✅ No breaking changes to existing passport

**Parent Dashboard**:
- ✅ Adds insights section
- ✅ Shows development comparisons
- ✅ Respects privacy settings

### 13.14 Success Criteria

- [ ] Graph relationships are automatically generated from existing data
- [ ] Similar players can be found based on skill profiles
- [ ] Coach effectiveness can be calculated
- [ ] Development patterns can be identified
- [ ] Insights are surfaced in UI (coach, parent, player passport)
- [ ] Performance is acceptable (< 2s for graph queries)
- [ ] Privacy is respected (opt-out available, organization boundaries)
- [ ] Cross-organization insights work with passport sharing
- [ ] Insights are actionable and useful

---

## 14. Better Auth Teams & TeamMembers Analysis

### 14.1 Current State

#### What We're Currently Using

**Better Auth Organization Plugin**:
- ✅ **Enabled**: `organization` plugin is configured
- ✅ **Teams Feature**: `teams: { enabled: true }` is set
- ✅ **Custom Team Fields**: Extended Better Auth `team` table with sports-specific fields:
  - `sport`, `ageGroup`, `gender`, `season`, `description`, `trainingSchedule`, `isActive`
- ✅ **Team Storage**: Teams are stored in Better Auth's `team` table

**Current Architecture**:
```
Better Auth Tables:
├── organization (Better Auth)
├── member (Better Auth) - links users to organizations
├── team (Better Auth) - team metadata with custom sports fields
└── teamMembers (Better Auth) - many-to-many: members ↔ teams

Convex Tables:
├── players (Convex) - player data (separate from Better Auth users)
├── teamPlayers (Convex) - junction: players ↔ teams
└── coachAssignments (Convex) - links coaches to teams via team IDs/names
```

**Current Implementation**:
- **Teams**: Stored in Better Auth `team` table ✅
- **Team-Player Links**: Custom `teamPlayers` junction table (Convex) ✅
- **Team-Coach Links**: Custom `coachAssignments` table (Convex) ❓
- **Team-Member Links**: Better Auth `teamMembers` table exists but **NOT USED** ❓

### 14.2 Better Auth TeamMembers Feature

#### What Better Auth Provides

**`teamMembers` Table**:
- **Purpose**: Many-to-many relationship between Better Auth `member` records and `team` records
- **Structure**:
  ```typescript
  teamMembers: {
    teamId: string;      // Better Auth team ID
    memberId: string;    // Better Auth member ID (links to member table)
    role?: string;       // Optional role within team (e.g., "coach", "player", "manager")
    createdAt: number;
  }
  ```
- **Client API**: Better Auth provides client methods:
  - `authClient.organization.addTeamMember({ teamId, memberId, role? })`
  - `authClient.organization.removeTeamMember({ teamId, memberId })`
  - `authClient.organization.listTeamMembers({ teamId })`
  - `authClient.organization.getMemberTeams({ memberId })`

**Key Features**:
- ✅ **Built-in**: No custom code needed
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Client API**: Direct client-side methods
- ✅ **Multi-team support**: Members can belong to multiple teams
- ✅ **Team roles**: Optional role within team (beyond org role)
- ✅ **Access control**: Can integrate with Better Auth permissions

### 14.3 Current vs. Better Auth Approach Comparison

#### Current Approach: Custom `coachAssignments` Table

**Structure**:
```typescript
coachAssignments: {
  userId: string;              // Better Auth user ID
  organizationId: string;     // Organization ID
  teams: string[];            // Array of team IDs or team names
  ageGroups: string[];        // Age groups coached
  sport?: string;             // Primary sport
  roles?: string[];            // Additional roles
  createdAt: number;
  updatedAt: number;
}
```

**Pros**:
- ✅ **Custom fields**: Can store `ageGroups`, `sport`, `roles` specific to coaching
- ✅ **Flexible**: Can store team names or IDs (handles both)
- ✅ **Organization-scoped**: Direct link to organization
- ✅ **Additional metadata**: Can store coaching-specific data

**Cons**:
- ❌ **Custom code**: Need to maintain custom queries/mutations
- ❌ **No client API**: Must use Convex queries/mutations
- ❌ **Duplication**: Teams stored in Better Auth, links stored in Convex
- ❌ **Inconsistency**: Different pattern than Better Auth's built-in approach
- ❌ **Manual sync**: Must manually keep in sync with Better Auth teams

#### Better Auth Approach: Use `teamMembers` Table

**Structure**:
```typescript
teamMembers: {
  teamId: string;      // Better Auth team ID
  memberId: string;    // Better Auth member ID
  role?: string;       // Optional: "coach", "assistant", etc.
  createdAt: number;
}
```

**Pros**:
- ✅ **Built-in**: No custom code needed
- ✅ **Client API**: Direct client-side methods available
- ✅ **Type-safe**: Full TypeScript support from Better Auth
- ✅ **Consistent**: Uses Better Auth's standard pattern
- ✅ **Automatic**: Automatically synced with Better Auth teams
- ✅ **Access control**: Can integrate with Better Auth permissions
- ✅ **Multi-team**: Native support for members in multiple teams

**Cons**:
- ❌ **Limited metadata**: Can only store `role` (string), no custom fields
- ❌ **No ageGroups**: Cannot store `ageGroups` array directly
- ❌ **No sport field**: Cannot store `sport` directly on team membership
- ❌ **Member-based**: Links `member` records, not `user` records directly
- ❌ **Less flexible**: Cannot store arbitrary coaching metadata

### 14.4 Requirements Analysis

#### What We Need for Coaches

**Current Requirements** (from `coachAssignments`):
1. ✅ Link coach to teams (team IDs)
2. ✅ Store age groups coached
3. ✅ Store primary sport
4. ✅ Store additional roles
5. ✅ Organization-scoped

**Can Better Auth `teamMembers` Handle This?**

| Requirement | Current (`coachAssignments`) | Better Auth (`teamMembers`) | Gap |
|-------------|------------------------------|-----------------------------|-----|
| Link coach to teams | ✅ `teams: string[]` | ✅ `teamId: string` (one per record) | Need multiple records for multiple teams |
| Store age groups | ✅ `ageGroups: string[]` | ❌ Not supported | **Missing** |
| Store sport | ✅ `sport?: string` | ❌ Not supported | **Missing** |
| Store roles | ✅ `roles?: string[]` | ⚠️ `role?: string` (single) | Limited to one role |
| Organization-scoped | ✅ `organizationId` | ✅ Via `member.organizationId` | ✅ Works |
| Client API | ❌ Custom Convex | ✅ Built-in | ✅ Better |

### 14.5 Hybrid Approach Analysis

#### Option A: Full Better Auth (Use `teamMembers` Only)

**Approach**: Replace `coachAssignments` with `teamMembers`

**Implementation**:
```typescript
// Instead of:
coachAssignments: {
  userId: "...",
  organizationId: "...",
  teams: ["team1", "team2"],
  ageGroups: ["U12", "U14"],
  sport: "Soccer"
}

// Use:
teamMembers: [
  { teamId: "team1", memberId: "member1", role: "coach" },
  { teamId: "team2", memberId: "member1", role: "coach" }
]

// Store additional metadata in team table or separate table
```

**Pros**:
- ✅ Uses Better Auth's built-in system
- ✅ Client API available
- ✅ Type-safe
- ✅ Consistent with Better Auth patterns

**Cons**:
- ❌ **Loses ageGroups**: Cannot store age groups per coach
- ❌ **Loses sport**: Cannot store sport per coach assignment
- ❌ **Loses roles array**: Can only store single role per team
- ❌ **More records**: Need one `teamMembers` record per team (vs. one `coachAssignments` record)
- ❌ **Metadata storage**: Need separate table for `ageGroups`, `sport`, etc.

**Verdict**: ❌ **Not Recommended** - Loses important coaching metadata

#### Option B: Hybrid (Use Both)

**Approach**: Use `teamMembers` for team links, keep `coachAssignments` for metadata

**Implementation**:
```typescript
// Better Auth teamMembers: Links coaches to teams
teamMembers: [
  { teamId: "team1", memberId: "member1", role: "coach" },
  { teamId: "team2", memberId: "member1", role: "coach" }
]

// Convex coachAssignments: Stores coaching metadata
coachAssignments: {
  userId: "...",
  organizationId: "...",
  ageGroups: ["U12", "U14"],  // Metadata not in Better Auth
  sport: "Soccer",             // Metadata not in Better Auth
  roles: ["head-coach"]        // Additional metadata
}
```

**Pros**:
- ✅ Uses Better Auth for team links (client API available)
- ✅ Keeps custom metadata (ageGroups, sport, roles)
- ✅ Best of both worlds
- ✅ Can query teams via Better Auth client API
- ✅ Can query metadata via Convex

**Cons**:
- ⚠️ **Duplication**: Team links stored in both places
- ⚠️ **Sync complexity**: Must keep `teamMembers` and `coachAssignments` in sync
- ⚠️ **Two sources of truth**: Risk of inconsistency

**Verdict**: ⚠️ **Possible but Complex** - Requires careful sync logic

#### Option C: Enhanced Better Auth (Extend `teamMembers`)

**Approach**: Extend Better Auth `teamMembers` table with custom fields

**Implementation**:
```typescript
// Extend Better Auth teamMembers schema
teamMembers: {
  teamId: string;
  memberId: string;
  role?: string;
  createdAt: number;
  
  // Custom fields (if Better Auth supports schema extension)
  ageGroups?: string[];
  sport?: string;
  additionalRoles?: string[];
}
```

**Pros**:
- ✅ Single source of truth
- ✅ Client API available
- ✅ All metadata in one place

**Cons**:
- ❌ **Better Auth limitation**: Better Auth may not support custom fields on `teamMembers`
- ❌ **Schema extension**: Would need to verify if this is possible
- ❌ **Migration complexity**: Would need to migrate existing data

**Verdict**: ❓ **Unknown** - Need to verify if Better Auth supports custom fields on `teamMembers`

#### Option D: Keep Current (Custom `coachAssignments`)

**Approach**: Continue using custom `coachAssignments` table

**Pros**:
- ✅ **Works now**: Already implemented and working
- ✅ **Flexible**: Can store any metadata needed
- ✅ **No migration**: No changes required
- ✅ **Single source**: One table for all coaching data

**Cons**:
- ❌ **No client API**: Must use Convex queries/mutations
- ❌ **Custom code**: Need to maintain custom implementation
- ❌ **Inconsistent**: Different from Better Auth patterns

**Verdict**: ✅ **Recommended for Now** - Simplest, most flexible

### 14.6 Recommendation

#### For Teams: ✅ Already Using Better Auth (Correct)

**Current State**: Teams are stored in Better Auth `team` table with custom sports fields.

**Recommendation**: **Continue using Better Auth teams** - This is correct and working well.

#### For Team-Coach Links: ⚠️ Keep Custom `coachAssignments` (For Now)

**Current State**: Using custom `coachAssignments` table to link coaches to teams.

**Recommendation**: **Keep using `coachAssignments`** for the following reasons:

1. **Metadata Requirements**: We need to store `ageGroups`, `sport`, and `roles` array, which Better Auth `teamMembers` doesn't support natively.

2. **Flexibility**: Custom table allows us to store any coaching-specific metadata without limitations.

3. **Working Solution**: Current implementation is working and doesn't need immediate change.

4. **Future Migration Path**: If Better Auth adds support for custom fields on `teamMembers`, we can migrate later.

#### For Team-Player Links: ✅ Keep Custom `teamPlayers` (Correct)

**Current State**: Using custom `teamPlayers` junction table to link players (Convex) to teams (Better Auth).

**Recommendation**: **Continue using `teamPlayers`** - Players are not Better Auth users, so `teamMembers` (which links Better Auth members) doesn't apply.

### 14.7 Future Considerations

#### If Better Auth Adds Custom Fields Support

**Scenario**: Better Auth adds support for custom fields on `teamMembers` table.

**Migration Path**:
1. Extend `teamMembers` schema with custom fields (`ageGroups`, `sport`, `roles`)
2. Migrate data from `coachAssignments` to `teamMembers`
3. Update queries to use Better Auth client API
4. Remove `coachAssignments` table

**Benefits**:
- Single source of truth
- Client API available
- Type-safe
- Consistent with Better Auth patterns

#### If We Need Better Auth Client API

**Scenario**: We want to use Better Auth's client API for team management.

**Hybrid Approach**:
- Use `teamMembers` for team links (via Better Auth client API)
- Keep `coachAssignments` for metadata only
- Sync `teamMembers` when `coachAssignments` changes

**Implementation**:
```typescript
// When coach is assigned to team:
// 1. Add to Better Auth teamMembers (via client API)
await authClient.organization.addTeamMember({
  teamId: "team1",
  memberId: "member1",
  role: "coach"
});

// 2. Update coachAssignments (via Convex mutation)
await ctx.runMutation(api.models.members.updateCoachAssignment, {
  userId: "...",
  organizationId: "...",
  teams: ["team1"],
  ageGroups: ["U12"],
  sport: "Soccer"
});
```

### 14.8 Decision Matrix

| Factor | Current (`coachAssignments`) | Better Auth (`teamMembers`) | Hybrid |
|--------|------------------------------|-----------------------------|--------|
| **Metadata Support** | ✅ Full (ageGroups, sport, roles) | ❌ Limited (role only) | ✅ Full |
| **Client API** | ❌ Custom Convex | ✅ Built-in | ✅ Built-in |
| **Type Safety** | ⚠️ Custom types | ✅ Better Auth types | ✅ Better Auth types |
| **Flexibility** | ✅ High | ❌ Low | ✅ High |
| **Consistency** | ❌ Custom pattern | ✅ Better Auth pattern | ⚠️ Mixed |
| **Maintenance** | ⚠️ Custom code | ✅ Built-in | ⚠️ Sync logic |
| **Migration Effort** | ✅ None (current) | ⚠️ Medium | ⚠️ High |

### 14.9 Final Recommendation

**For Organizations**: ✅ **Continue using Better Auth** - Already correct.

**For Teams**: ✅ **Continue using Better Auth** - Already correct, with custom sports fields.

**For Team-Coach Links**: ✅ **Keep custom `coachAssignments`** - Provides necessary metadata that Better Auth `teamMembers` doesn't support.

**For Team-Player Links**: ✅ **Keep custom `teamPlayers`** - Players are not Better Auth users, so `teamMembers` doesn't apply.

**Future Enhancement**: If Better Auth adds custom field support for `teamMembers`, consider migrating `coachAssignments` to use `teamMembers` with custom fields, while keeping `teamPlayers` for player-team links.

### 14.10 Open Questions

**Q1**: Does Better Auth support custom fields on `teamMembers` table?
- **Action**: Check Better Auth documentation/schema extension capabilities
- **Impact**: Would enable migration to Better Auth `teamMembers` if supported

**Q2**: Can we use Better Auth client API for team management while keeping custom metadata?
- **Answer**: Yes, via hybrid approach (use both `teamMembers` and `coachAssignments`)
- **Trade-off**: Requires sync logic to keep both in sync

**Q3**: Should we migrate `coachAssignments` to use `teamMembers` for team links only?
- **Recommendation**: Not necessary - current approach works and is simpler
- **Future**: Revisit if Better Auth adds custom field support

---

## 15. Authentication Solution Alternatives Analysis

### 15.1 Current Better Auth Usage

#### What We're Using

**Core Features**:
- ✅ Email/password authentication
- ✅ Social providers (Google, Microsoft)
- ✅ Session management
- ✅ Multi-tenancy (organizations)
- ✅ Teams within organizations
- ✅ Custom roles and access control
- ✅ Invitation system
- ✅ Convex integration (`@convex-dev/better-auth`)

**Key Dependencies**:
- `better-auth`: 1.3.27
- `@convex-dev/better-auth`: ^0.9.1
- Organization plugin with teams enabled
- Custom access control with roles (owner, admin, member, coach, parent)
- Custom schema extensions (team sports fields, member functional roles)

**Integration Points**:
- Convex backend (via adapter)
- Next.js frontend (via React hooks)
- Custom email sending (Resend.com)
- Custom invitation flow

### 15.2 Alternative Solutions Comparison

#### Option A: Clerk

**Overview**: Fully managed authentication service with pre-built UI components.

**Pros**:
- ✅ **Pre-built UI**: Beautiful, customizable login/signup components
- ✅ **Managed Service**: No backend code needed for auth
- ✅ **Rich Features**: Organizations, teams, roles, permissions out of the box
- ✅ **Great DX**: Excellent TypeScript support, React hooks
- ✅ **Social Logins**: Easy integration with many providers
- ✅ **User Management**: Built-in user dashboard
- ✅ **Multi-tenancy**: Native organization support
- ✅ **Active Development**: Well-maintained, regular updates

**Cons**:
- ❌ **Cost**: Pricing starts at $25/month, scales with MAU (Monthly Active Users)
- ❌ **Vendor Lock-in**: Fully managed, less control
- ❌ **Convex Integration**: Would need custom adapter (not officially supported)
- ❌ **Custom Schema**: Limited ability to extend schema
- ❌ **Migration Complexity**: Would require significant refactoring
- ❌ **Less Flexibility**: Harder to customize core auth flows

**Pricing**: 
- Free tier: Up to 10,000 MAU
- Pro: $25/month + $0.02 per MAU over 10k
- Enterprise: Custom pricing

**Verdict**: ⚠️ **Good but Expensive** - Great features but cost and Convex integration concerns

#### Option B: Auth.js (NextAuth.js v5)

**Overview**: Open-source authentication library for Next.js (formerly NextAuth.js).

**Pros**:
- ✅ **Open Source**: Free, self-hosted
- ✅ **Next.js Native**: Built specifically for Next.js
- ✅ **Flexible**: Highly customizable
- ✅ **Many Providers**: Supports 50+ OAuth providers
- ✅ **TypeScript**: Full TypeScript support
- ✅ **Active Community**: Large, active community
- ✅ **No Vendor Lock-in**: Self-hosted, full control

**Cons**:
- ❌ **No Built-in Multi-tenancy**: Would need to build organizations/teams from scratch
- ❌ **No Convex Adapter**: Would need to build custom adapter
- ❌ **More Code**: Requires more custom code than Better Auth
- ❌ **No Teams Feature**: Would need to build teams system
- ❌ **Less Structured**: Less opinionated, more decisions to make
- ❌ **Migration Complexity**: Significant refactoring required

**Verdict**: ⚠️ **Possible but Complex** - Would require building multi-tenancy from scratch

#### Option C: Supabase Auth

**Overview**: Open-source Firebase alternative with built-in authentication.

**Pros**:
- ✅ **Open Source**: Self-hosted option available
- ✅ **Built-in Auth**: Authentication included
- ✅ **PostgreSQL**: Uses PostgreSQL (could migrate from Convex)
- ✅ **Row Level Security**: Built-in RLS for multi-tenancy
- ✅ **TypeScript**: Full TypeScript support
- ✅ **Free Tier**: Generous free tier

**Cons**:
- ❌ **Database Migration**: Would require migrating from Convex to PostgreSQL
- ❌ **No Convex Integration**: Would need to abandon Convex
- ❌ **Different Architecture**: Different backend paradigm
- ❌ **Migration Complexity**: Very high - would require full backend rewrite
- ❌ **Teams Feature**: Would need to build teams system

**Verdict**: ❌ **Not Recommended** - Would require abandoning Convex

#### Option D: Auth0

**Overview**: Enterprise-grade identity and access management platform.

**Pros**:
- ✅ **Enterprise Features**: Advanced features (MFA, SSO, etc.)
- ✅ **Scalable**: Handles millions of users
- ✅ **Multi-tenancy**: Built-in organization support
- ✅ **Managed Service**: No backend code needed
- ✅ **Many Providers**: Supports many identity providers

**Cons**:
- ❌ **Cost**: Expensive ($23/month + per MAU pricing)
- ❌ **Complexity**: Over-engineered for our needs
- ❌ **Vendor Lock-in**: Fully managed, less control
- ❌ **Convex Integration**: Would need custom adapter
- ❌ **Migration Complexity**: Significant refactoring
- ❌ **Overkill**: Too many features we don't need

**Verdict**: ❌ **Not Recommended** - Too expensive and complex for our needs

#### Option E: Kinde

**Overview**: All-in-one authentication and user management platform.

**Pros**:
- ✅ **Pre-built UI**: Customizable UI components
- ✅ **Multi-tenancy**: Built-in organization support
- ✅ **User Management**: Built-in user dashboard
- ✅ **TypeScript**: Full TypeScript support
- ✅ **Managed Service**: No backend code needed

**Cons**:
- ❌ **Cost**: Pricing starts at $99/month
- ❌ **Vendor Lock-in**: Fully managed
- ❌ **Convex Integration**: Would need custom adapter
- ❌ **Migration Complexity**: Significant refactoring
- ❌ **Less Flexible**: Harder to customize

**Verdict**: ❌ **Not Recommended** - Too expensive

#### Option F: SuperTokens

**Overview**: Open-source authentication solution with self-hosting option.

**Pros**:
- ✅ **Open Source**: Free, self-hosted option
- ✅ **Flexible**: Highly customizable
- ✅ **Multi-tenancy**: Built-in organization support
- ✅ **TypeScript**: Full TypeScript support
- ✅ **No Vendor Lock-in**: Self-hosted option

**Cons**:
- ❌ **No Convex Adapter**: Would need to build custom adapter
- ❌ **Less Popular**: Smaller community than Better Auth
- ❌ **Migration Complexity**: Significant refactoring
- ❌ **Teams Feature**: Would need to build teams system
- ❌ **Less Documentation**: Less documentation than Better Auth

**Verdict**: ⚠️ **Possible but Complex** - Similar to Better Auth but less Convex integration

#### Option G: Stay with Better Auth

**Overview**: Continue using Better Auth (current solution).

**Pros**:
- ✅ **Already Integrated**: Working with Convex
- ✅ **Open Source**: Free, self-hosted
- ✅ **Convex Support**: Official Convex adapter (`@convex-dev/better-auth`)
- ✅ **Multi-tenancy**: Organization plugin with teams
- ✅ **Flexible**: Highly customizable
- ✅ **TypeScript**: Full TypeScript support
- ✅ **Custom Schema**: Can extend schema easily
- ✅ **No Migration**: No refactoring needed
- ✅ **Active Development**: Regular updates
- ✅ **Cost**: Free (self-hosted)

**Cons**:
- ⚠️ **Smaller Community**: Smaller than Clerk/Auth0
- ⚠️ **Less Documentation**: Less documentation than enterprise solutions
- ⚠️ **Self-hosted**: Need to manage ourselves (but we're already doing this)

**Verdict**: ✅ **Recommended** - Best fit for our requirements

### 15.3 Requirements-Based Comparison

#### PlayerARC Requirements

| Requirement | Better Auth | Clerk | Auth.js | Supabase | Auth0 | Kinde | SuperTokens |
|-------------|-------------|-------|---------|----------|-------|-------|-------------|
| **Convex Integration** | ✅ Official | ❌ Custom | ❌ Custom | ❌ N/A | ❌ Custom | ❌ Custom | ❌ Custom |
| **Multi-tenancy** | ✅ Built-in | ✅ Built-in | ❌ Custom | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| **Teams Feature** | ✅ Built-in | ✅ Built-in | ❌ Custom | ❌ Custom | ✅ Built-in | ✅ Built-in | ❌ Custom |
| **Custom Roles** | ✅ Flexible | ✅ Built-in | ❌ Custom | ⚠️ Limited | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| **Custom Schema** | ✅ Extensible | ⚠️ Limited | ✅ Flexible | ✅ Flexible | ⚠️ Limited | ⚠️ Limited | ✅ Flexible |
| **Cost** | ✅ Free | ❌ $25+/mo | ✅ Free | ✅ Free | ❌ $23+/mo | ❌ $99+/mo | ✅ Free |
| **Migration Effort** | ✅ None | ❌ High | ❌ High | ❌ Very High | ❌ High | ❌ High | ❌ High |
| **TypeScript** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Social Logins** | ✅ Many | ✅ Many | ✅ Many | ✅ Many | ✅ Many | ✅ Many | ✅ Many |

### 15.4 Migration Complexity Analysis

#### If We Switched to Clerk

**Effort Required**:
1. **Backend Refactoring**: Replace all Better Auth Convex queries with Clerk API calls
2. **Frontend Refactoring**: Replace Better Auth hooks with Clerk hooks
3. **Schema Migration**: Migrate organization/team data to Clerk
4. **Custom Logic**: Rebuild invitation flow, access control, etc.
5. **Testing**: Comprehensive testing of all auth flows
6. **Cost**: $25+/month ongoing

**Estimated Time**: 2-3 weeks of development + testing

**Risk**: High - Significant refactoring, potential bugs, vendor lock-in

#### If We Switched to Auth.js

**Effort Required**:
1. **Build Multi-tenancy**: Create organization/team system from scratch
2. **Build Teams**: Create teams feature from scratch
3. **Build Convex Adapter**: Create custom adapter for Convex
4. **Rebuild Access Control**: Rebuild role/permission system
5. **Rebuild Invitations**: Rebuild invitation flow
6. **Testing**: Comprehensive testing

**Estimated Time**: 4-6 weeks of development + testing

**Risk**: Very High - Building complex features from scratch

### 15.5 Cost Analysis

#### Current (Better Auth)
- **Cost**: $0 (self-hosted, open source)
- **Infrastructure**: Included in Convex hosting
- **Total**: $0/month

#### Clerk
- **Free Tier**: Up to 10,000 MAU
- **Pro**: $25/month + $0.02 per MAU over 10k
- **Example**: 5,000 MAU = $25/month, 20,000 MAU = $225/month
- **Total**: $25-$225+/month depending on usage

#### Auth.js / SuperTokens
- **Cost**: $0 (self-hosted, open source)
- **Infrastructure**: Included in Convex hosting
- **Total**: $0/month

#### Auth0 / Kinde
- **Cost**: $23-$99+/month + per MAU pricing
- **Total**: $100-$500+/month depending on usage

### 15.6 Feature Comparison

#### Multi-tenancy Support

| Feature | Better Auth | Clerk | Auth.js | Others |
|---------|-------------|-------|---------|--------|
| Organizations | ✅ Built-in | ✅ Built-in | ❌ Custom | ✅ Most |
| Teams | ✅ Built-in | ✅ Built-in | ❌ Custom | ⚠️ Some |
| Custom Roles | ✅ Flexible | ✅ Built-in | ❌ Custom | ✅ Most |
| Access Control | ✅ Custom | ✅ Built-in | ❌ Custom | ✅ Most |

#### Convex Integration

| Feature | Better Auth | Clerk | Auth.js | Others |
|---------|-------------|-------|---------|--------|
| Official Adapter | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Type Safety | ✅ Full | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial |
| Schema Extension | ✅ Easy | ⚠️ Limited | ✅ Easy | ⚠️ Varies |

### 15.7 Recommendation

#### ✅ **Stay with Better Auth**

**Rationale**:

1. **Perfect Fit for Convex**: Better Auth has official Convex integration (`@convex-dev/better-auth`), which is critical for our architecture.

2. **Already Working**: Our current implementation is working well. No need to fix what isn't broken.

3. **Cost Effective**: Free and open source, no ongoing costs.

4. **Flexible**: Can customize schema, roles, and access control to our exact needs.

5. **Multi-tenancy Built-in**: Organization and teams features are already implemented and working.

6. **Low Migration Risk**: Staying with Better Auth means no migration risk, no refactoring, no bugs.

7. **Active Development**: Better Auth is actively maintained and regularly updated.

8. **TypeScript Support**: Full TypeScript support with excellent type safety.

**When to Reconsider**:

- **If Better Auth stops being maintained**: Then consider alternatives
- **If we need enterprise features**: Then consider Auth0 or Clerk
- **If we outgrow Better Auth**: Then consider scaling to enterprise solution
- **If Convex integration breaks**: Then consider alternatives with Convex support

### 15.8 Alternative Recommendation (If We Must Switch)

**If we had to switch**, the best alternative would be **Clerk** because:
- ✅ Best multi-tenancy support
- ✅ Best developer experience
- ✅ Pre-built UI components
- ✅ Excellent TypeScript support

**But**:
- ❌ Would require custom Convex integration
- ❌ Ongoing costs ($25+/month)
- ❌ Vendor lock-in
- ❌ Significant migration effort

**Verdict**: Only consider if Better Auth becomes unmaintained or we need enterprise features.

### 15.9 Conclusion

**Better Auth is the best choice for PlayerARC** because:
1. ✅ Official Convex integration
2. ✅ Already implemented and working
3. ✅ Free and open source
4. ✅ Flexible and customizable
5. ✅ Multi-tenancy built-in
6. ✅ No migration risk
7. ✅ Active development

**No need to switch** - Better Auth meets all our requirements and is well-integrated with our Convex backend.

---

## 17. Role Selector & Active Role Management: MVP vs Current Site Analysis

### 17.1 MVP Role Switcher Analysis

#### MVP Approach

**Key Features**:
- ✅ **Active Role Concept**: User has an `activeRole` field that determines which role they're currently "using"
- ✅ **Role Switching**: Users can switch between their assigned roles via dropdown
- ✅ **Static Display**: If user has only one role, shows static badge (no dropdown)
- ✅ **Request Additional Role**: Users can request additional roles they don't have
- ✅ **Visual Feedback**: Active role highlighted in green, shows "Active" label
- ✅ **Loading State**: Shows "Switching..." during role change

**Implementation**:
```typescript
// MVP: User-level active role
const user = {
  roles: ["Coach", "Parent"], // All roles user has
  activeRole: "Coach", // Currently active role
};

// Switching role updates activeRole field
await switchActiveRole({ newRole: "Parent" });
```

**Limitations**:
- ❌ **Single Organization**: MVP doesn't support multiple organizations
- ❌ **User-Level Roles**: Roles are stored on user, not organization-scoped
- ❌ **No Org Context**: Can't have different roles in different organizations

### 17.2 Current Site Functional Role Indicator Analysis

#### Current Approach

**Key Features**:
- ✅ **Organization-Scoped Roles**: Roles are stored per organization (member.functionalRoles)
- ✅ **Multi-Org Support**: User can have different roles in different organizations
- ✅ **Read-Only Display**: Shows roles but doesn't allow switching
- ✅ **Visual Display**: Shows badges with icons, dropdown for multiple roles
- ✅ **Primary Role Indicator**: Shows first role as "Primary" (but not switchable)

**Implementation**:
```typescript
// Current: Organization-scoped functional roles
const member = {
  organizationId: "org_123",
  functionalRoles: ["coach", "parent"], // Roles in this org
  // No activeRole concept
};

// Roles are displayed but not switchable
<FunctionalRoleIndicator functionalRoles={member.functionalRoles} />
```

**Limitations**:
- ❌ **No Role Switching**: Users can't switch between their roles
- ❌ **No Active Role**: No concept of which role is currently "active"
- ❌ **No Dashboard Redirect**: Switching role doesn't redirect to appropriate dashboard
- ❌ **No Role Request**: No way to request additional roles (though join requests exist)

### 17.3 Integrated Approach: Multi-Org Role Switcher

#### Design Principles

**1. Organization-Scoped Active Role**:
- Active role is stored per organization (not globally)
- User can have different active roles in different organizations
- Switching role in one org doesn't affect other orgs

**2. Combined Org + Role Selector**:
- Unified component that shows both organization and role
- Can switch both organization and role in one place
- Clear visual hierarchy: Org → Role

**3. Dashboard Redirect on Role Switch**:
- When role is switched, redirect to appropriate dashboard
- Priority: Coach > Admin > Parent (same as current redirect logic)

**4. Role Request Integration**:
- For requesting additional roles in current organization
- Uses existing join request system or new role request system

#### Proposed Component: `OrgRoleSwitcher`

**Location**: Header (replaces separate `OrgSelector` and `FunctionalRoleIndicator`)

**Features**:
- **Organization Selector**: Dropdown to switch between organizations
- **Role Selector**: Dropdown to switch between roles in current organization
- **Combined Display**: Shows "Organization Name - Active Role"
- **Quick Switch**: Click to open combined dropdown
- **Request Role**: Option to request additional roles

**UI Design**:
```
┌─────────────────────────────────────────┐
│ [Org Logo] Grange GFC - Coach ▼        │ ← Combined button
└─────────────────────────────────────────┘
         ↓ (click)
┌─────────────────────────────────────────┐
│ Organizations                            │
├─────────────────────────────────────────┤
│ ✓ Grange GFC                            │
│   Coach (Active)                         │
│   Parent                                 │
│   [Request Role]                         │
├─────────────────────────────────────────┤
│ Local Rugby Club                         │
│   Parent (Active)                        │
│   [Request Role]                         │
├─────────────────────────────────────────┤
│ + Create Organization                   │
└─────────────────────────────────────────┘
```

#### Implementation Specification

**1. Schema Extension**:

```typescript
// Add activeFunctionalRole to member table
member: {
  // ... existing fields ...
  functionalRoles: ["coach", "parent", "admin"], // All roles
  activeFunctionalRole: "coach", // Currently active role (optional)
}
```

**2. Backend Mutations**:

```typescript
// packages/backend/convex/models/members.ts

/**
 * Switch active functional role for a member in an organization
 */
export const switchActiveFunctionalRole = mutation({
  args: {
    organizationId: v.string(),
    functionalRole: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
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

    if (!member) {
      throw new Error("Member not found");
    }

    // Verify user has this functional role
    const functionalRoles = (member as any).functionalRoles || [];
    if (!functionalRoles.includes(args.functionalRole)) {
      throw new Error(`You don't have the ${args.functionalRole} role in this organization`);
    }

    // Update active functional role
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: member._id, operator: "eq" }],
        update: {
          activeFunctionalRole: args.functionalRole,
        },
      },
    });

    return null;
  },
});

/**
 * Get member's active functional role (with fallback to first role)
 */
export const getActiveFunctionalRole = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.literal("coach"),
    v.literal("parent"),
    v.literal("admin"),
    v.null()
  ),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      return null;
    }

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

    if (!member) {
      return null;
    }

    const functionalRoles = (member as any).functionalRoles || [];
    if (functionalRoles.length === 0) {
      return null;
    }

    // Return active role if set, otherwise return first role (default)
    const activeRole = (member as any).activeFunctionalRole;
    if (activeRole && functionalRoles.includes(activeRole)) {
      return activeRole;
    }

    // Fallback: return first role (priority: coach > admin > parent)
    const priority = ["coach", "admin", "parent"];
    for (const role of priority) {
      if (functionalRoles.includes(role)) {
        return role as "coach" | "parent" | "admin";
      }
    }

    return functionalRoles[0] as "coach" | "parent" | "admin";
  },
});

/**
 * Get all memberships for a user across all organizations
 * Used by OrgRoleSwitcher to show all orgs and roles
 */
export const getMembersForAllOrganizations = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(v.object({
    organizationId: v.string(),
    organizationName: v.union(v.string(), v.null()),
    functionalRoles: v.array(v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))),
    activeFunctionalRole: v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"), v.null()),
    betterAuthRole: v.string(),
  })),
  handler: async (ctx, args) => {
    // Get all memberships for this user
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
          },
        ],
      }
    );

    // Get organization details for each membership
    const memberships = await Promise.all(
      membersResult.page.map(async (member) => {
        const orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "_id",
                value: member.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        return {
          organizationId: member.organizationId,
          organizationName: orgResult?.name || null,
          functionalRoles: (member as any).functionalRoles || [],
          activeFunctionalRole: (member as any).activeFunctionalRole || null,
          betterAuthRole: member.role,
        };
      })
    );

    return memberships;
  },
});
```

**3. Frontend Component**:

```typescript
// apps/web/src/components/org-role-switcher.tsx

"use client";

import { Building2, ChevronDown, Shield, UserCircle, Users, Plus, Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import type { Route } from "next";

type FunctionalRole = "coach" | "parent" | "admin";

function getRoleIcon(role: FunctionalRole) {
  switch (role) {
    case "coach":
      return <Users className="h-4 w-4 text-green-600" />;
    case "parent":
      return <UserCircle className="h-4 w-4 text-blue-600" />;
    case "admin":
      return <Shield className="h-4 w-4 text-purple-600" />;
  }
}

function getRoleLabel(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "Coach";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
  }
}

function getRoleDashboardRoute(orgId: string, role: FunctionalRole): Route {
  switch (role) {
    case "coach":
      return `/orgs/${orgId}/coach` as Route;
    case "parent":
      return `/orgs/${orgId}/parents` as Route;
    case "admin":
      return `/orgs/${orgId}/admin` as Route;
  }
}

export function OrgRoleSwitcher() {
  const router = useRouter();
  const params = useParams();
  const urlOrgId = params.orgId as string | undefined;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const user = useCurrentUser();
  const { data: organizations, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();

  // Get members for all organizations to show roles
  const allMembers = useQuery(
    api.models.members.getMembersForAllOrganizations,
    user?._id ? { userId: user._id } : "skip"
  );

  const switchActiveRole = useMutation(api.models.members.switchActiveFunctionalRole);

  const currentOrg = organizations?.find((org) => org.id === urlOrgId);
  const currentMember = allMembers?.find(
    (m) => m.organizationId === urlOrgId
  );

  const functionalRoles =
    ((currentMember as any)?.functionalRoles as FunctionalRole[] | undefined) || [];
  const activeRole =
    ((currentMember as any)?.activeFunctionalRole as FunctionalRole | undefined) ||
    functionalRoles[0]; // Fallback to first role

  const handleSwitchOrg = async (orgId: string) => {
    setOpen(false);
    // Set organization as active
    await authClient.organization.setActive({ organizationId: orgId });
    // Get member for new org
    const newOrgMember = allMembers?.find((m) => m.organizationId === orgId);
    const newOrgRoles =
      ((newOrgMember as any)?.functionalRoles as FunctionalRole[] | undefined) || [];
    const newActiveRole =
      ((newOrgMember as any)?.activeFunctionalRole as FunctionalRole | undefined) ||
      newOrgRoles[0];

    // Redirect to appropriate dashboard
    if (newActiveRole) {
      router.push(getRoleDashboardRoute(orgId, newActiveRole));
    } else {
      router.push(`/orgs/${orgId}` as Route);
    }
  };

  const handleSwitchRole = async (role: FunctionalRole) => {
    if (!urlOrgId || role === activeRole) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      await switchActiveRole({
        organizationId: urlOrgId,
        functionalRole: role,
      });

      // Redirect to appropriate dashboard
      router.push(getRoleDashboardRoute(urlOrgId, role));
      setOpen(false);
    } catch (error) {
      console.error("Error switching role:", error);
      // Show error toast
    } finally {
      setSwitching(false);
    }
  };

  if (isLoadingOrgs || !organizations || organizations.length === 0) {
    return null;
  }

  // Build org-role structure for display
  const orgRoleStructure = organizations.map((org) => {
    const member = allMembers?.find((m) => m.organizationId === org.id);
    const roles =
      ((member as any)?.functionalRoles as FunctionalRole[] | undefined) || [];
    const active =
      ((member as any)?.activeFunctionalRole as FunctionalRole | undefined) ||
      roles[0];

    return {
      org,
      member,
      roles,
      activeRole: active,
    };
  });

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-[240px] justify-between"
          disabled={switching}
          variant="outline"
        >
          {switching ? (
            "Switching..."
          ) : currentOrg && activeRole ? (
            <div className="flex items-center gap-2 truncate">
              {currentOrg.logo ? (
                <img
                  alt=""
                  className="h-4 w-4 rounded"
                  src={currentOrg.logo}
                />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span className="truncate">{currentOrg.name}</span>
              <span className="text-gray-400">-</span>
              {getRoleIcon(activeRole)}
              <span className="truncate">{getRoleLabel(activeRole)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Select org...</span>
            </div>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            {orgRoleStructure.map(({ org, roles, activeRole: orgActiveRole }) => (
              <CommandGroup key={org.id} heading={org.name}>
                {roles.length === 0 ? (
                  <CommandItem disabled>
                    <span className="text-muted-foreground text-sm">
                      No roles assigned
                    </span>
                  </CommandItem>
                ) : (
                  roles.map((role) => (
                    <CommandItem
                      key={`${org.id}-${role}`}
                      onSelect={() => {
                        if (urlOrgId === org.id) {
                          // Same org, just switch role
                          handleSwitchRole(role);
                        } else {
                          // Different org, switch org and role
                          handleSwitchOrg(org.id);
                          // Note: Role will be set after org switch
                        }
                      }}
                      value={`${org.id}-${role}`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          <span>{getRoleLabel(role)}</span>
                        </div>
                        {urlOrgId === org.id && role === orgActiveRole && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </CommandItem>
                  ))
                )}
                {/* Request Role Option */}
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/orgs/${org.id}/admin/users` as Route);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Request Role</span>
                </CommandItem>
              </CommandGroup>
            ))}

            {user && "isPlatformStaff" in user && user.isPlatformStaff ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      router.push("/orgs/create" as Route);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create Organization</span>
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

**4. Updated Redirect Logic**:

```typescript
// apps/web/src/app/orgs/current/page.tsx

function getRedirectRoute(
  orgId: string,
  memberRole: OrgMemberRole | undefined,
  functionalRoles: string[],
  activeFunctionalRole?: string // NEW: Use active role if set
): Route {
  // Priority: Use activeFunctionalRole if set, otherwise use priority logic
  const roleToUse = activeFunctionalRole || 
    (functionalRoles.includes("coach") ? "coach" :
     functionalRoles.includes("admin") ? "admin" :
     functionalRoles.includes("parent") ? "parent" : null);

  if (roleToUse === "coach") {
    return `/orgs/${orgId}/coach` as Route;
  }

  if (roleToUse === "admin") {
    return `/orgs/${orgId}/admin` as Route;
  }

  if (roleToUse === "parent") {
    return `/orgs/${orgId}/parents` as Route;
  }

  return "/orgs";
}
```

### 17.4 Comparison Matrix

| Feature | MVP | Current Site | Integrated Approach |
|---------|-----|--------------|---------------------|
| **Role Switching** | ✅ Yes | ❌ No | ✅ Yes |
| **Active Role Concept** | ✅ Yes (user-level) | ❌ No | ✅ Yes (org-scoped) |
| **Multi-Org Support** | ❌ No | ✅ Yes | ✅ Yes |
| **Org-Scoped Roles** | ❌ No | ✅ Yes | ✅ Yes |
| **Dashboard Redirect** | ⚠️ Partial | ✅ Yes | ✅ Yes (on role switch) |
| **Request Additional Role** | ✅ Yes | ❌ No | ✅ Yes (via admin UI) |
| **Visual Feedback** | ✅ Yes | ✅ Yes | ✅ Yes (enhanced) |
| **Combined Selector** | ❌ No | ❌ No | ✅ Yes |

### 17.5 Benefits of Integrated Approach

**1. Best of Both Worlds**:
- ✅ Role switching from MVP
- ✅ Multi-org support from current site
- ✅ Organization-scoped roles from current site
- ✅ Dashboard redirect on switch

**2. Improved UX**:
- ✅ Single component for org + role selection
- ✅ Clear visual hierarchy
- ✅ Quick switching between contexts
- ✅ Consistent behavior across orgs

**3. Technical Benefits**:
- ✅ Organization-scoped active role (no conflicts)
- ✅ Can have different active roles in different orgs
- ✅ Proper dashboard routing on switch
- ✅ Maintains existing redirect logic

### 17.6 Migration Strategy

**Phase 1: Add Active Role Field**:
- Add `activeFunctionalRole` to member schema
- Default to first role (priority: coach > admin > parent)
- Update existing members

**Phase 2: Implement Backend Mutations**:
- Add `switchActiveFunctionalRole` mutation
- Add `getActiveFunctionalRole` query
- Add `getMembersForAllOrganizations` query
- Update redirect logic to use active role

**Phase 3: Create Combined Component**:
- Create `OrgRoleSwitcher` component
- Replace `OrgSelector` and `FunctionalRoleIndicator` in header
- Add role switching functionality

**Phase 4: Update Redirects**:
- Update `/orgs/current` to use active role
- Update role-based redirects to respect active role
- Add redirect on role switch

### 17.7 Edge Cases & Considerations

**1. User Has No Roles in Org**:
- Show "No roles assigned" message
- Allow requesting roles (redirect to admin/users page)
- Don't show role switcher

**2. User Switches Org with Different Roles**:
- Set active role to first available role in new org
- Redirect to appropriate dashboard
- Preserve active role preference per org

**3. User Loses Role (Admin Removes)**:
- If active role is removed, switch to first available role
- Show notification about role removal
- Redirect to appropriate dashboard

**4. User Gains New Role**:
- New role appears in dropdown
- Active role remains unchanged (unless it was removed)
- User can manually switch to new role

**5. Multiple Roles, No Active Role Set**:
- Use priority logic: coach > admin > parent
- Auto-set active role on first access
- Persist preference for future visits

### 17.8 Request Additional Role Feature

**Current State**: 
- MVP has `RequestAdditionalRole` component
- Current site has join requests (but for joining org, not requesting roles)

**Integrated Approach**:
- **Option A**: Use existing admin UI (`/orgs/[orgId]/admin/users`)
  - User navigates to admin page
  - Admin can assign additional roles
  - Simpler, reuses existing UI

- **Option B**: Create role request system (like MVP)
  - New `roleRequests` table
  - User can request specific roles
  - Admin approves/rejects
  - More structured, but more complex

**Recommendation**: Start with Option A (admin UI), add Option B later if needed.

---

## 18. Owner Role Management: Complete Implementation Plan

### 18.1 Current State Analysis

#### What We Have Documented

**Owner Role Assignment**:
- ✅ **Automatic**: When user creates organization → becomes owner
- ✅ **Manual Transfer**: Owner can transfer ownership via `authClient.organization.updateMemberRole()`
- ❌ **Cannot be assigned via invitation**: Only `admin` or `member` can be invited
- ❌ **Cannot be assigned via join request**: Only `admin` or `member` can be requested

**Owner Permissions**:
- ✅ Full organization management (name, logo, colors, delete org)
- ✅ Transfer ownership to another member
- ✅ Invite/remove any member (including admins)
- ✅ Change any member's role (including making/removing owners)
- ✅ All Better Auth permissions granted by default

#### What's Missing

**UI/UX**:
- ❌ **No Transfer Ownership UI**: Settings page has delete org, but no transfer ownership feature
- ❌ **No Owner Display**: No clear indication of who the current owner is
- ❌ **No Owner Management Section**: No dedicated UI for owner management

**Backend**:
- ❌ **No Transfer Ownership Mutation**: Need custom mutation to handle ownership transfer safely
- ❌ **No Get Current Owner Query**: Need query to identify current owner(s)
- ❌ **No Ownership Transfer Validation**: Need to ensure only owner can transfer

**Flows**:
- ❌ **No Ownership Transfer Flow**: No step-by-step process for transferring ownership
- ❌ **No Confirmation Dialog**: No warning/confirmation before transfer
- ❌ **No Post-Transfer Handling**: No logic for what happens after transfer

**Permissions**:
- ⚠️ **Partially Implemented**: `getUserOrgRole` query exists but not used everywhere
- ❌ **No Owner-Only UI Sections**: Settings page checks `isOwner` but no owner-specific sections

### 18.2 How to Get Owner Permission

#### Method 1: Create Organization (Automatic)

**When**: User creates a new organization via `/orgs/create`

**Implementation**:
```typescript
// apps/web/src/app/orgs/create/page.tsx
const { data } = await authClient.organization.create({
  name: "Grange GFC",
  slug: "grange-gfc",
});
// User who calls this automatically becomes owner
```

**Result**:
- User's Better Auth role: `"owner"`
- User's functional role: `["admin"]` (auto-assigned via `onMemberAdded` hook)
- User can manage organization, transfer ownership, delete org

**Limitations**:
- Only works for new organizations
- Cannot retroactively make someone owner of existing org (except via transfer)

#### Method 2: Ownership Transfer (Manual)

**When**: Current owner transfers ownership to another existing member

**Current Implementation** (via Better Auth client):
```typescript
// Owner can transfer ownership
await authClient.organization.updateMemberRole({
  memberId: "member_123",
  role: "owner",
  organizationId: "org_123",
});
// Previous owner becomes "admin", new owner gets "owner" role
```

**What Happens**:
- Better Auth automatically demotes previous owner to `"admin"`
- New member gets `"owner"` role
- Previous owner retains functional role `["admin"]` (if they had it)
- New owner gets functional role `["admin"]` (via `onMemberAdded` hook if they're new, or manually if existing)

**Limitations**:
- ❌ **No UI**: Currently only possible via direct API call
- ❌ **No Validation**: No check to ensure caller is current owner
- ❌ **No Confirmation**: No warning dialog before transfer
- ❌ **No Audit Trail**: No logging of ownership transfers

### 18.3 Required UI Updates

#### 18.3.1 Organization Settings Page Enhancement

**Location**: `/orgs/[orgId]/admin/settings`

**Current State**:
- ✅ Shows delete organization (owner only)
- ❌ No owner management section
- ❌ No display of current owner
- ❌ No transfer ownership feature

**Required Updates**:

**1. Add "Owner Management" Section**:

```typescript
// apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx

// Add new state
const [transferDialogOpen, setTransferDialogOpen] = useState(false);
const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
const [transferring, setTransferring] = useState(false);

// Add query to get current owner
const currentOwner = useQuery(api.models.members.getCurrentOwner, {
  organizationId: orgId,
});

// Add query to get all members (for owner selection)
const allMembers = useQuery(api.models.members.getMembersByOrganization, {
  organizationId: orgId,
});

// Add mutation for ownership transfer
const transferOwnership = useMutation(api.models.members.transferOwnership);
```

**2. Add Owner Display Card**:

```typescript
{/* Owner Management Section - Only visible to owner */}
{isOwner && (
  <Card>
    <CardHeader>
      <CardTitle>Owner Management</CardTitle>
      <CardDescription>
        Manage organization ownership and transfer to another member
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Current Owner Display */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Current Owner</p>
            <div className="mt-1 flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentOwner?.user?.image || undefined} />
                <AvatarFallback>
                  {currentOwner?.user?.name?.charAt(0) || "O"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{currentOwner?.user?.name || "Unknown"}</p>
                <p className="text-muted-foreground text-sm">
                  {currentOwner?.user?.email || ""}
                </p>
              </div>
              <Badge className="ml-2" variant="default">
                Owner
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Ownership Button */}
      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex-1">
          <h3 className="font-semibold">Transfer Ownership</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Transfer ownership of this organization to another member. You will become an admin after the transfer.
          </p>
        </div>
        <Button
          onClick={() => setTransferDialogOpen(true)}
          variant="outline"
        >
          Transfer Ownership
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**3. Add Transfer Ownership Dialog**:

```typescript
{/* Transfer Ownership Dialog */}
<Dialog onOpenChange={setTransferDialogOpen} open={transferDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
        Transfer Ownership
      </DialogTitle>
      <DialogDescription>
        Select a member to transfer ownership to. This action cannot be undone.
        You will become an admin after the transfer.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>You will lose the ability to delete this organization</li>
            <li>You will lose the ability to transfer ownership again</li>
            <li>The new owner will have full control over the organization</li>
            <li>This action cannot be undone</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Member Selection */}
      <div className="space-y-2">
        <Label htmlFor="newOwner">Select New Owner</Label>
        <Select
          onValueChange={setSelectedNewOwner}
          value={selectedNewOwner || ""}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a member..." />
          </SelectTrigger>
          <SelectContent>
            {allMembers
              ?.filter((member) => {
                // Exclude current owner
                return member.userId !== currentOwner?.userId;
              })
              .map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.user?.image || undefined} />
                      <AvatarFallback>
                        {member.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs">
                        {member.user?.email || ""} • {member.role}
                      </p>
                    </div>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Only existing members can become owners. The selected member must already be a member of this organization.
        </p>
      </div>

      {/* Confirmation Checkbox */}
      <div className="flex items-start space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <Checkbox
          id="confirmTransfer"
          checked={confirmTransfer}
          onCheckedChange={setConfirmTransfer}
        />
        <Label
          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="confirmTransfer"
        >
          I understand that I will lose owner privileges and this action cannot be undone.
        </Label>
      </div>
    </div>

    <DialogFooter>
      <Button
        onClick={() => {
          setTransferDialogOpen(false);
          setSelectedNewOwner(null);
          setConfirmTransfer(false);
        }}
        variant="outline"
      >
        Cancel
      </Button>
      <Button
        disabled={!selectedNewOwner || !confirmTransfer || transferring}
        onClick={handleTransferOwnership}
        variant="destructive"
      >
        {transferring ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Transferring...
          </>
        ) : (
          "Transfer Ownership"
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**4. Add Transfer Handler**:

```typescript
const handleTransferOwnership = async () => {
  if (!selectedNewOwner) {
    toast.error("Please select a member to transfer ownership to");
    return;
  }

  setTransferring(true);
  try {
    await transferOwnership({
      organizationId: orgId,
      newOwnerMemberId: selectedNewOwner,
    });

    toast.success("Ownership transferred successfully");
    setTransferDialogOpen(false);
    setSelectedNewOwner(null);
    setConfirmTransfer(false);

    // Refresh page or redirect to show updated owner
    router.refresh();
  } catch (error: any) {
    console.error("Error transferring ownership:", error);
    toast.error(error.message || "Failed to transfer ownership");
  } finally {
    setTransferring(false);
  }
};
```

#### 18.3.2 Manage Users Page Enhancement

**Location**: `/orgs/[orgId]/admin/users`

**Current State**:
- ✅ Shows all members with their roles
- ✅ Allows changing Better Auth roles (admin/member)
- ❌ Does not show owner role clearly
- ❌ Does not allow transferring ownership from this page

**Required Updates**:

**1. Add Owner Badge**:

```typescript
// In member card, add owner indicator
{member.role === "owner" && (
  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
    Owner
  </Badge>
)}
```

**2. Add Transfer Ownership Action** (for owner only):

```typescript
// In member actions dropdown (if current user is owner)
{isOwner && member.role !== "owner" && (
  <DropdownMenuItem
    onClick={() => {
      setTransferTargetMemberId(member._id);
      setTransferDialogOpen(true);
    }}
    className="text-amber-600"
  >
    <Shield className="mr-2 h-4 w-4" />
    Transfer Ownership
  </DropdownMenuItem>
)}
```

**3. Disable Role Changes for Owner**:

```typescript
// In role selector, disable if member is owner
<Select
  disabled={member.role === "owner" || loading === member.userId}
  onValueChange={(value) => {
    // Handle role change
  }}
  value={member.role}
>
  {/* Options */}
</Select>
{member.role === "owner" && (
  <p className="text-muted-foreground text-xs">
    Owner role cannot be changed. Transfer ownership to change.
  </p>
)}
```

#### 18.3.3 Organization Overview Page Enhancement

**Location**: `/orgs/[orgId]/admin`

**Current State**:
- ✅ Shows organization stats
- ❌ Does not show current owner

**Required Updates**:

**1. Add Owner Display in Stats**:

```typescript
// Add owner card to stats section
<StatCard
  description="Organization owner"
  icon={Shield}
  title="Owner"
  value={currentOwner?.user?.name || "Unknown"}
  variant="default"
/>
```

### 18.4 Required Backend Implementation

#### 18.4.1 Get Current Owner Query

**File**: `packages/backend/convex/models/members.ts`

```typescript
/**
 * Get the current owner(s) of an organization
 * Returns owner member with user details
 */
export const getCurrentOwner = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.string(),
      userId: v.string(),
      organizationId: v.string(),
      role: v.literal("owner"),
      user: v.union(
        v.object({
          _id: v.string(),
          name: v.union(v.string(), v.null()),
          email: v.string(),
          image: v.union(v.string(), v.null()),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get all members with owner role
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "role",
            value: "owner",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (membersResult.page.length === 0) {
      return null;
    }

    // Get first owner (typically only one)
    const owner = membersResult.page[0];

    // Get user details
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: owner.userId,
            operator: "eq",
          },
        ],
      }
    );

    return {
      _id: owner._id,
      userId: owner.userId,
      organizationId: owner.organizationId,
      role: "owner" as const,
      user: userResult
        ? {
            _id: userResult._id,
            name: userResult.name || null,
            email: userResult.email,
            image: userResult.image || null,
          }
        : null,
    };
  },
});
```

#### 18.4.2 Transfer Ownership Mutation

**File**: `packages/backend/convex/models/members.ts`

```typescript
/**
 * Transfer ownership of an organization to another member
 * Only the current owner can transfer ownership
 * 
 * What happens:
 * 1. Previous owner's role changes from "owner" to "admin"
 * 2. New owner's role changes to "owner"
 * 3. Both retain their functional roles
 * 4. Audit log entry created (if audit logging exists)
 */
export const transferOwnership = mutation({
  args: {
    organizationId: v.string(),
    newOwnerMemberId: v.string(), // Member ID (not user ID) of new owner
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // 1. Verify current user is the owner
    const currentOwnerMember = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: currentUser._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
          {
            field: "role",
            value: "owner",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!currentOwnerMember) {
      throw new Error("Only the current owner can transfer ownership");
    }

    // 2. Verify new owner member exists and is in the organization
    const newOwnerMember = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "_id",
            value: args.newOwnerMemberId,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!newOwnerMember) {
      throw new Error("New owner member not found in this organization");
    }

    // 3. Prevent transferring to self
    if (newOwnerMember.userId === currentUser._id) {
      throw new Error("You are already the owner");
    }

    // 4. Transfer ownership (Better Auth handles role changes)
    // First, set new owner to "owner" role
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: args.newOwnerMemberId, operator: "eq" }],
        update: {
          role: "owner",
        },
      },
    });

    // 5. Set previous owner to "admin" role
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: currentOwnerMember._id, operator: "eq" }],
        update: {
          role: "admin",
        },
      },
    });

    // 6. Ensure both have functional "admin" role (if they don't already)
    const previousOwnerFunctionalRoles = (currentOwnerMember as any).functionalRoles || [];
    if (!previousOwnerFunctionalRoles.includes("admin")) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "member",
          where: [{ field: "_id", value: currentOwnerMember._id, operator: "eq" }],
          update: {
            functionalRoles: [...previousOwnerFunctionalRoles, "admin"],
          },
        },
      });
    }

    const newOwnerFunctionalRoles = (newOwnerMember as any).functionalRoles || [];
    if (!newOwnerFunctionalRoles.includes("admin")) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "member",
          where: [{ field: "_id", value: args.newOwnerMemberId, operator: "eq" }],
          update: {
            functionalRoles: [...newOwnerFunctionalRoles, "admin"],
          },
        },
      });
    }

    // 7. Log ownership transfer (if audit logging exists)
    // TODO: Add audit log entry for ownership transfer

    console.log("[transferOwnership] Ownership transferred:", {
      organizationId: args.organizationId,
      previousOwner: currentUser._id,
      newOwner: newOwnerMember.userId,
    });

    return null;
  },
});
```

#### 18.4.3 Get All Members Query (Enhanced)

**File**: `packages/backend/convex/models/members.ts`

**Update existing `getMembersByOrganization` to include owner indicator**:

```typescript
// Already exists, but ensure it includes role information
// Members returned should include:
// - role: "owner" | "admin" | "member"
// - user: User details
// - functionalRoles: Functional roles array
```

### 18.5 Ownership Transfer Flow

#### 18.5.1 Complete Transfer Flow

**Step 1: Owner Initiates Transfer**
- Owner navigates to `/orgs/[orgId]/admin/settings`
- Clicks "Transfer Ownership" button
- Transfer dialog opens

**Step 2: Owner Selects New Owner**
- Dialog shows list of all members (excluding current owner)
- Owner selects a member from dropdown
- Shows member details (name, email, current role)

**Step 3: Owner Confirms Transfer**
- Owner checks confirmation checkbox
- Owner reads warning about losing privileges
- Owner clicks "Transfer Ownership" button

**Step 4: Backend Validates and Transfers**
- Backend verifies current user is owner
- Backend verifies new owner member exists
- Backend updates roles:
  - Previous owner: `role: "owner"` → `role: "admin"`
  - New owner: `role: "admin"` or `role: "member"` → `role: "owner"`
- Backend ensures both have functional `["admin"]` role

**Step 5: UI Updates**
- Settings page refreshes
- New owner is displayed
- Previous owner sees admin view
- Success toast shown

**Step 6: Redirect (Optional)**
- Previous owner redirected to admin dashboard
- New owner can access owner-only features

#### 18.5.2 Edge Cases

**1. Multiple Owners (Better Auth supports this)**:
- If multiple owners exist, all can transfer ownership
- Transfer affects only the transferring owner
- Other owners remain as owners

**2. Owner Leaves Organization**:
- If owner leaves, organization has no owner
- Need fallback: First admin becomes owner, or organization becomes unmanaged
- **Recommendation**: Prevent owner from leaving until ownership is transferred

**3. Owner Account Deleted**:
- If owner account is deleted, organization has no owner
- Need admin intervention or automatic promotion of first admin
- **Recommendation**: Add validation to prevent deleting owner account

**4. Transfer to Non-Member**:
- Cannot transfer to someone who isn't a member
- UI should only show existing members
- Backend validates membership

**5. Transfer to Self**:
- Prevented in UI and backend
- Show error: "You are already the owner"

### 18.6 Permissions & Access Control

#### 18.6.1 Owner-Only Permissions

**What Only Owner Can Do**:
- ✅ Delete organization
- ✅ Transfer ownership
- ✅ Change any member's role to "owner" (via transfer)
- ✅ Remove any member (including other owners, if multiple exist)

**What Owner Cannot Do**:
- ❌ Remove their own owner role (must transfer first)
- ❌ Leave organization while owner (must transfer first)

#### 18.6.2 Permission Checks Required

**1. Settings Page Access**:
```typescript
// apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx
const userRole = useQuery(api.models.organizations.getUserOrgRole, {
  organizationId: orgId,
});
const isOwner = userRole?.isOwner ?? false;

// Show owner management section only if owner
{isOwner && <OwnerManagementSection />}
```

**2. Transfer Ownership Mutation**:
```typescript
// Backend validates owner before allowing transfer
const currentOwnerMember = await ctx.runQuery(/* find owner */);
if (!currentOwnerMember) {
  throw new Error("Only the current owner can transfer ownership");
}
```

**3. Delete Organization**:
```typescript
// Already implemented in deleteOrganization mutation
if (memberResult.role !== "owner") {
  throw new Error("Only organization owners can delete the organization");
}
```

**4. Change Member Roles**:
```typescript
// In manage users page, prevent changing owner role
if (member.role === "owner") {
  // Disable role selector
  // Show message: "Owner role cannot be changed. Transfer ownership to change."
}
```

### 18.7 UI/UX Best Practices

#### 18.7.1 Owner Display

**Where to Show Owner**:
- ✅ Organization settings page (owner management section)
- ✅ Organization overview page (stats card)
- ✅ Manage users page (owner badge on member card)
- ✅ Organization header (optional: show owner badge)

**How to Display**:
- Use `Badge` component with amber/yellow color (distinct from admin purple)
- Show owner name and email
- Show "Owner" label clearly
- Use `Shield` icon for owner

#### 18.7.2 Transfer Ownership Dialog

**Design Principles**:
- ⚠️ **Warning-First**: Show warnings prominently
- ✅ **Clear Consequences**: List what owner will lose
- ✅ **Member Selection**: Easy-to-use dropdown with member details
- ✅ **Confirmation Required**: Checkbox to confirm understanding
- ✅ **Destructive Styling**: Use destructive variant for transfer button

**Warning Messages**:
- "You will lose the ability to delete this organization"
- "You will lose the ability to transfer ownership again"
- "The new owner will have full control over the organization"
- "This action cannot be undone"

#### 18.7.3 Owner Management Section

**Location**: Organization settings page (`/orgs/[orgId]/admin/settings`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ Owner Management                        │
├─────────────────────────────────────────┤
│ Current Owner                           │
│ [Avatar] John Doe (john@example.com)   │
│ [Owner Badge]                           │
│                                         │
│ Transfer Ownership                      │
│ [Warning Box]                           │
│ [Transfer Ownership Button]             │
└─────────────────────────────────────────┘
```

### 18.8 Implementation Checklist

#### Phase 1: Backend (Week 1)

- [ ] Add `getCurrentOwner` query
- [ ] Add `transferOwnership` mutation
- [ ] Add validation: only owner can transfer
- [ ] Add validation: cannot transfer to self
- [ ] Ensure functional roles are set correctly after transfer
- [ ] Add logging for ownership transfers

#### Phase 2: Settings Page UI (Week 1-2)

- [ ] Add "Owner Management" section to settings page
- [ ] Add current owner display card
- [ ] Add transfer ownership button
- [ ] Add transfer ownership dialog
- [ ] Add member selection dropdown
- [ ] Add confirmation checkbox
- [ ] Add warning messages
- [ ] Add transfer handler
- [ ] Add success/error toasts

#### Phase 3: Manage Users Page Enhancement (Week 2)

- [ ] Add owner badge to member cards
- [ ] Add "Transfer Ownership" action to member dropdown (owner only)
- [ ] Disable role changes for owner
- [ ] Show message: "Owner role cannot be changed"
- [ ] Add transfer dialog (reuse from settings)

#### Phase 4: Organization Overview (Week 2)

- [ ] Add owner stat card
- [ ] Show current owner name
- [ ] Link to settings page for owner management

#### Phase 5: Validation & Edge Cases (Week 3)

- [ ] Prevent owner from leaving organization
- [ ] Prevent deleting owner account
- [ ] Handle multiple owners scenario
- [ ] Add fallback if no owner exists
- [ ] Test all edge cases

#### Phase 6: Testing & Documentation (Week 3)

- [ ] Test ownership transfer flow
- [ ] Test permission checks
- [ ] Test edge cases
- [ ] Update user documentation
- [ ] Add admin guide for ownership management

### 18.9 Security Considerations

#### 18.9.1 Authorization Checks

**Critical**: Always verify owner status on backend:
```typescript
// ✅ CORRECT: Verify on backend
const currentOwnerMember = await ctx.runQuery(/* find owner */);
if (!currentOwnerMember) {
  throw new Error("Only the current owner can transfer ownership");
}

// ❌ WRONG: Relying only on frontend check
if (isOwner) {
  // Frontend check can be bypassed
}
```

#### 18.9.2 Audit Trail

**Recommendation**: Log all ownership transfers:
```typescript
// Add to transferOwnership mutation
await ctx.db.insert("auditLog", {
  action: "ownership_transferred",
  organizationId: args.organizationId,
  previousOwner: currentUser._id,
  newOwner: newOwnerMember.userId,
  timestamp: Date.now(),
  performedBy: currentUser._id,
});
```

#### 18.9.3 Rate Limiting

**Consideration**: Prevent rapid ownership transfers:
- Add cooldown period (e.g., 24 hours between transfers)
- Or require admin approval for transfers
- Or limit transfers per organization per month

### 18.10 Future Enhancements

#### 18.10.1 Ownership History

**Feature**: Track ownership history
- New table: `ownershipHistory`
- Log all ownership transfers
- Show history in settings page
- Useful for auditing and compliance

#### 18.10.2 Ownership Transfer Requests

**Feature**: Allow members to request ownership
- New table: `ownershipTransferRequests`
- Member can request to become owner
- Current owner can approve/reject
- Useful when owner is inactive

#### 18.10.3 Co-Owners

**Feature**: Support multiple owners (Better Auth supports this)
- UI to show all owners
- Transfer to any owner
- All owners can delete org, transfer ownership
- Useful for shared organizations

### 18.11 Summary

**Current State**:
- ✅ Owner role automatically assigned on org creation
- ✅ Owner can transfer via Better Auth API
- ❌ No UI for ownership management
- ❌ No transfer ownership flow
- ❌ No owner display

**Required Implementation**:
1. **Backend**: `getCurrentOwner` query, `transferOwnership` mutation
2. **UI**: Owner management section in settings, transfer dialog
3. **Flows**: Complete ownership transfer flow with confirmation
4. **Permissions**: Owner-only access checks throughout
5. **Edge Cases**: Handle multiple owners, owner leaving, etc.

**Benefits**:
- ✅ Clear ownership management
- ✅ Safe ownership transfer process
- ✅ Better UX for organization management
- ✅ Prevents accidental ownership loss
- ✅ Audit trail for compliance

---

## Appendix: Decision Log

| Decision | Date | Rationale |
|----------|------|-----------|
| Remove "coach" and "parent" from Better Auth roles | TBD | Eliminates confusion, clear separation |
| Auto-assign functional "admin" when Better Auth "admin" | TBD | Reduces manual work |
| Auto-link parent to children on role assignment | TBD | Improves user experience |
| Use invitation metadata for functional roles | TBD | Faster onboarding |
| Check functional roles for capability permissions | TBD | Correct access control |
| Cross-org passport sharing: Parent-controlled, opt-in only | TBD | Privacy-first approach, parent consent required |
| Auto-infer Better Auth role from functional roles | TBD | Simpler UI, logical mapping, prevents mismatches |
| Owner management: Transfer-only, not promotion | TBD | Ownership should be transferred, not assigned to new users |
| Integrated OrgRoleSwitcher: Combined org + role selector with active role switching | TBD | Best of both MVP and current site, multi-org support, improved UX |

