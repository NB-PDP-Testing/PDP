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

#### Enhanced Invitation Process with Auto-Assignment

**Why This Works**: Better Auth's `inviteMember` API supports a `metadata` field that can store custom data. This metadata is preserved in the invitation record and is accessible in the `onMemberAdded` hook when the user accepts. This allows us to:

1. ✅ **UI collects functional roles** during invitation
2. ✅ **Metadata stores functional roles** in invitation record
3. ✅ **Hook auto-assigns functional roles** when user accepts
4. ✅ **Zero manual steps** - fully automated

**Step 1: Admin Invites User (Enhanced UI)**

The invitation dialog is enhanced to allow selecting functional roles:

```typescript
// Enhanced Invitation Dialog UI
const [inviteEmail, setInviteEmail] = useState("");
const [inviteBetterAuthRole, setInviteBetterAuthRole] = useState<"member" | "admin">("member");
const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<FunctionalRole[]>([]);
const [invitePlayerLinks, setInvitePlayerLinks] = useState<string[]>([]); // Optional: specific players
const [inviteTeamAssignments, setInviteTeamAssignments] = useState<string[]>([]); // Optional: teams for coach

const handleInvite = async () => {
  await authClient.organization.inviteMember({
    email: inviteEmail,
    organizationId: orgId,
    role: inviteBetterAuthRole, // Better Auth role (hierarchy): "member" or "admin"
    metadata: {
      // Functional roles (capabilities) - stored in invitation metadata
      suggestedFunctionalRoles: inviteFunctionalRoles, // ["coach", "parent"]
      
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
- `role`: Better Auth role ("member" or "admin")
- `metadata`: Our custom data:
  ```json
  {
    "suggestedFunctionalRoles": ["coach", "parent"],
    "suggestedPlayerLinks": ["playerId1", "playerId2"],
    "roleSpecificData": {
      "teams": ["U12 Boys"]
    }
  }
  ```

**Step 3: User Accepts Invitation**

- User clicks invitation link
- If not logged in, redirected to login/signup
- After authentication, Better Auth creates `member` record with `role: "member"` (or "admin")
- **`onMemberAdded` hook fires automatically**

**Step 4: Auto-Assignment Hook (Fully Automated)**

The hook reads the invitation metadata and auto-assigns everything:

```typescript
async onMemberAdded(data) {
  const { member, organization, role, invitation } = data;
  const userId = member.userId;
  const organizationId = organization.id;
  
  console.log("[onMemberAdded] Member added via invitation:", {
    userId,
    organizationId,
    betterAuthRole: role,
    invitationId: invitation?.id,
    metadata: invitation?.metadata,
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

- Based on functional roles assigned
- Parent → `/orgs/[orgId]/parents`
- Coach → `/orgs/[orgId]/coach`
- Admin → `/orgs/[orgId]/admin`
- Multiple roles → Priority: Coach > Admin > Parent

**Result**: User is fully set up with functional roles, player links, and coach assignments - **zero manual steps required!**

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

**Example UI Flow**:
```
Admin clicks "Invite Member"
  ↓
Dialog opens with:
  - Email input
  - Better Auth Role: [Member ▼] or [Admin ▼]
  - Functional Roles:
    ☐ Coach
    ☐ Parent
    ☐ Admin (only if Better Auth role is "admin")
  - If Coach selected:
    - Teams: [Multi-select dropdown]
  - If Parent selected:
    - Link to specific players: [Search/Select players] (optional)
  ↓
Admin fills form and clicks "Send Invitation"
  ↓
Invitation sent with metadata:
  {
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

## Appendix: Decision Log

| Decision | Date | Rationale |
|----------|------|-----------|
| Remove "coach" and "parent" from Better Auth roles | TBD | Eliminates confusion, clear separation |
| Auto-assign functional "admin" when Better Auth "admin" | TBD | Reduces manual work |
| Auto-link parent to children on role assignment | TBD | Improves user experience |
| Use invitation metadata for functional roles | TBD | Faster onboarding |
| Check functional roles for capability permissions | TBD | Correct access control |
| Cross-org passport sharing: Parent-controlled, opt-in only | TBD | Privacy-first approach, parent consent required |

