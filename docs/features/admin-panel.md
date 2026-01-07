# Admin Panel Setup - Organization-Scoped

This document describes the admin panel implementation that properly uses Better Auth's organization plugin.

## Overview

The admin panel is **organization-scoped** - all routes are under `/orgs/[orgId]/admin` to ensure proper multi-tenancy and data isolation.

### What You Can Manage

- **Organizations**: Create organizations at `/orgs/create`
- **Users**: Approval workflow for new users (custom approval status)
- **Teams**: Create and manage teams using Better Auth client API
- **Players**: View and manage player rosters (custom table, separate from auth users)

## Routes Structure

```
/orgs/create                           - Create new organization
/orgs/[orgId]/admin                    - Admin dashboard overview
/orgs/[orgId]/admin/users              - Manage organization members
/orgs/[orgId]/admin/users/approvals    - Approve/reject new users
/orgs/[orgId]/admin/teams              - Manage teams
```

## Better Auth Client API First

**🎯 Key Principle: Use Better Auth's client API directly whenever possible.**

Better Auth provides a complete client-side API for managing organizations, teams, and members as documented in the [Better Auth Organization plugin docs](https://www.better-auth.com/llms.txt/docs/plugins/organization.md).

### Organization Operations

```typescript
import { authClient } from "@/lib/auth-client";

// Create organization
const { data, error } = await authClient.organization.create({
  name: "Grange RFC",
  slug: "grange-rfc",
  logo: "https://...", // optional
  metadata: { sport: "Rugby" }, // optional
});

// Check if slug is available
const { data } = await authClient.organization.checkSlug({
  slug: "grange-rfc",
});

// List user's organizations
const { data } = await authClient.organization.list();

// Update organization
await authClient.organization.update({
  organizationId: "...",
  data: { name: "...", logo: "..." },
});
```

### Team Operations (Custom Sports Fields Supported!)

```typescript
// Create team with custom sports fields
const { data, error } = await authClient.organization.createTeam({
  name: "U12 Boys A",
  organizationId: orgId,
  // Custom fields from betterAuth/schema.ts
  sport: "GAA Football",
  ageGroup: "U12",
  gender: "Boys",
  season: "2025",
  description: "Competitive squad",
  trainingSchedule: "Tuesdays & Thursdays 6-7pm",
  homeVenue: "Main Pitch",
  isActive: true,
});

// Update team
await authClient.organization.updateTeam({
  teamId: "...",
  data: {
    name: "U12 Boys A",
    trainingSchedule: "Updated schedule",
    // Any custom fields
  },
});

// Delete team
await authClient.organization.deleteTeam({
  teamId: "...",
});

// List teams (TODO: implement in UI)
const { data } = await authClient.organization.listTeams({
  organizationId: orgId,
});
```

### Member Management

```typescript
// List organization members
const { data } = await authClient.organization.listMembers({
  organizationId: orgId,
});

// Invite user to organization
await authClient.organization.inviteUser({
  email: "coach@example.com",
  organizationId: orgId,
  role: "admin", // or "member"
});

// Update member role
await authClient.organization.updateMemberRole({
  memberId: "...",
  role: "admin",
});

// Remove member
await authClient.organization.removeMember({
  memberId: "...",
});

// Assign coach to team
await authClient.organization.addTeamMember({
  teamId: "...",
  userId: "...",
});

// Remove coach from team
await authClient.organization.removeTeamMember({
  teamId: "...",
  userId: "...",
});
```

## When to Create Backend Functions

**Only create backend functions when you need:**

1. **Custom filtering/aggregation** - Better Auth doesn't support
2. **Combining multiple data sources** - e.g., Better Auth users + custom players table
3. **Custom business logic** - e.g., our approval workflow

### Current Backend Functions

#### User Management (`packages/backend/convex/models/users.ts`)

**Custom approval workflow only:**

```typescript
// These handle our CUSTOM approvalStatus field (not part of Better Auth)
getPendingUsers(); // Users with approvalStatus = "pending"
getApprovedUsers(); // Users with approvalStatus = "approved"
getRejectedUsers(); // Users with approvalStatus = "rejected"

// Approval workflow mutations
approveUser({ userId }); // Approve a user
rejectUser({ userId, rejectionReason }); // Reject with reason
unrejectUser({ userId }); // Move rejected back to pending

// Utility
getCurrentUser(); // Get current authenticated user
```

**For ALL other user/member operations** → Use `authClient.organization.*` methods!

#### Player Management (`packages/backend/convex/models/players.ts`)

Players are in our custom table (separate from auth users):

```typescript
// Query players
getAllPlayers();
getPlayersByOrganization({ organizationId });
getPlayersByTeam({ teamId });
getPlayerById({ playerId });
searchPlayersByName({ searchTerm });
getPlayersByAgeGroup({ ageGroup });
getPlayersBySport({ sport });
getPlayerCountByTeam({ teamId });

// Mutations
createPlayer({ name, ageGroup, sport, gender, teamId, organizationId, ... });
updatePlayer({ playerId, ...fields });
deletePlayer({ playerId });
```

## Custom Fields in Better Auth Tables

Defined in `packages/backend/convex/betterAuth/schema.ts`:

### User Table Extensions

```typescript
const customUserTable = defineTable({
  // ... Better Auth base fields ...
  
  // Custom profile fields
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),

  // Onboarding & approval workflow
  onboardingCompleted: v.optional(v.boolean()),
  approvalStatus: v.optional(
    v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
  ),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  rejectionReason: v.optional(v.string()),
})
```

### Team Table Extensions

```typescript
const customTeamTable = defineTable({
  // ... Better Auth base fields ...
  
  // Sports-specific fields
  sport: v.optional(v.string()),         // "GAA Football", "Hurling", etc.
  ageGroup: v.optional(v.string()),      // "U12", "U14", etc.
  gender: v.optional(                    // Team gender
    v.union(v.literal("Boys"), v.literal("Girls"), v.literal("Mixed"))
  ),
  season: v.optional(v.string()),        // "2025"
  description: v.optional(v.string()),
  trainingSchedule: v.optional(v.string()), // "Tuesdays 6-7pm"
  homeVenue: v.optional(v.string()),     // "Main Pitch"
  isActive: v.optional(v.boolean()),
})
```

These custom fields are automatically available in Better Auth client API calls per the [Additional Fields documentation](https://www.better-auth.com/llms.txt/docs/plugins/organization.md#additional-fields).

## Frontend Pages

### Create Organization (`apps/web/src/app/orgs/create/page.tsx`)

New organization creation flow:
- Form with name, slug, logo (optional), metadata (optional)
- Real-time slug availability checking using `authClient.organization.checkSlug()`
- Auto-generates slug from name
- Creates organization using `authClient.organization.create()`
- Redirects to new org's admin page after creation
- Shows helpful info about what happens next

### Admin Layout (`apps/web/src/app/orgs/[orgId]/admin/layout.tsx`)

- Organization-scoped navigation with `orgId` in all URLs
- Auth protection using Convex's `<Authenticated>` component
- Mobile-responsive navigation
- Links back to main dashboard

### Admin Overview (`apps/web/src/app/orgs/[orgId]/admin/page.tsx`)

Dashboard showing:
- Stats: Pending approvals, active users, teams, players (org-scoped)
- Quick actions with org-aware links
- Recent pending users preview
- Recent rejected users preview
- All data filtered by organization

### User Approvals (`apps/web/src/app/orgs/[orgId]/admin/users/approvals/page.tsx`)

Custom approval workflow:
- Uses backend functions for custom `approvalStatus` field
- Tabs for Pending and Rejected users
- Approve/Reject with confirmation
- Rejection reason tracking
- "Review Again" for rejected users

### Manage Users (`apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`)

Organization member management:
- Uses `authClient.organization.listMembers()` to fetch members
- View all members with role badges (owner, admin, member)
- Filter by role
- Search by name or email
- Expandable cards showing member details
- Stats by role

### Manage Teams (`apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx`)

Team management using Better Auth client API:
- Uses `authClient.organization.createTeam()` - includes custom sports fields
- Uses `authClient.organization.updateTeam()` - updates any fields
- Uses `authClient.organization.deleteTeam()` - removes team
- Filter by sport and age group
- Shows player counts (from custom players table)
- Warning badges for missing info
- Full form with all custom sports fields
- Active/inactive toggle
- Success/error toasts using sonner

## Organization Context

All admin pages extract `orgId` from the URL:

```typescript
const params = useParams();
const orgId = params.orgId as string;

// Use it in all operations
const players = useQuery(api.models.players.getPlayersByOrganization, {
  organizationId: orgId,
});
```

This ensures:
- **Data isolation** between organizations
- **Proper multi-tenancy** - users only see their org's data
- **Secure access** - org ID is validated by Better Auth

## Implementation Details

### Using Backend Functions (Only When Necessary)

```typescript
import { components } from "../_generated/api";
import { authComponent } from "../auth";

// Query Better Auth tables via component (rare - only for custom logic)
const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  model: "user",
  paginationOpts: { cursor: null, numItems: 1000 },
  where: [{ field: "approvalStatus", value: "pending", operator: "eq" }],
});

// Get current user
const currentUser = await authComponent.getAuthUser(ctx);

// Update Better Auth tables via component (rare)
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
    update: { approvalStatus: "approved", approvedAt: Date.now() },
  },
});
```

### Using Better Auth Client (Default)

```typescript
import { authClient } from "@/lib/auth-client";

// ✅ This is the preferred approach
const { data, error } = await authClient.organization.createTeam({
  name: "Team Name",
  organizationId: orgId,
  // Custom fields work automatically!
  sport: "GAA Football",
  ageGroup: "U12",
});

// ✅ All member operations
await authClient.organization.listMembers({ organizationId: orgId });
await authClient.organization.updateMemberRole({ memberId, role: "admin" });

// ✅ Team member operations (assigning coaches to teams)
await authClient.organization.addTeamMember({ teamId, userId });
```

## Custom Tables Beyond Better Auth

We have custom tables in `packages/backend/convex/schema.ts` for sports-specific data:

- **players** - Athletes/children (separate from auth users), linked to Better Auth teams via `teamId`
- **injuries** - Injury tracking for players
- **developmentGoals** - Player development goals
- **voiceNotes** - Coach voice notes with AI insights
- **medicalProfiles** - Medical information for players
- **teamGoals** - Team-wide development goals
- **coachInsightPreferences** - AI preferences per coach
- **approvalActions** - Audit trail for approvals/rejections

These require backend functions in `packages/backend/convex/models/` since they're not part of Better Auth.

## Next Steps

1. **✅ Organization Creation** - Implemented at `/orgs/create`
2. **Implement Team Loading**: Wire up `authClient.organization.listTeams()` to fetch and display teams
3. **Add Member Invitations**: Use `authClient.organization.inviteUser()` for inviting new members
4. **Coach Assignment**: Implement assigning coaches to teams via `authClient.organization.addTeamMember()`
5. **Link Players to Parents**: Add UI for linking parent users to player records
6. **Organization Selector**: Add UI to switch between organizations user belongs to
7. **Permissions**: Check member roles to show/hide admin features

## Usage

### Creating an Organization

1. Navigate to `/orgs/create`
2. Fill in organization name (slug auto-generates)
3. Optionally add logo URL and metadata
4. Click "Create Organization"
5. You'll be redirected to `/orgs/[orgId]/admin`

### Managing an Organization

Navigate to `/orgs/[orgId]/admin` where `[orgId]` is your organization ID (e.g., `org_123abc`).

All pages are protected with Better Auth authentication and scoped to the organization context.

## Key Benefits

✅ **Proper Multi-Tenancy** - Organizations are fully isolated
✅ **Uses Better Auth Best Practices** - Leverages client API as recommended
✅ **Custom Fields** - Sports-specific fields in teams automatically work
✅ **Minimal Backend Code** - Only for custom business logic
✅ **Type-Safe** - TypeScript types inferred from Better Auth schema
