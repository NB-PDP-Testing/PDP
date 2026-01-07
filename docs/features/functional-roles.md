# Custom Roles in Better Auth Organizations

This project uses Better Auth's access control system to define custom roles for organization members.

## Roles

We have three custom roles defined:

### 1. **Member** (Default)

Basic access for all organization members.

**Permissions:**

- `team`: view
- `player`: view
- `training`: view
- `report`: view

### 2. **Coach**

Extended access for team coaches to manage teams, players, and training sessions.

**Permissions:**

- `team`: view, manage
- `player`: view, create, update
- `training`: view, create, update
- `report`: view, create

### 3. **Parent**

Access for parents to view information and create reports about their players.

**Permissions:**

- `team`: view
- `player`: view
- `training`: view
- `report`: view, create

## File Structure

### Server-Side (Backend)

- **`packages/backend/convex/betterAuth/accessControl.ts`** - Defines access control statement and roles
- **`packages/backend/convex/auth.ts`** - Imports and configures roles in the organization plugin

### Client-Side (Frontend)

- **`apps/web/src/lib/accessControl.ts`** - Mirror of server-side access control (must stay in sync)
- **`apps/web/src/lib/auth-client.ts`** - Imports and configures roles in the client

## Usage

### Assigning Roles

When creating or updating organization members, you can specify their role:

```typescript
// Create a member with the coach role
await authClient.organization.inviteMember({
  email: "coach@example.com",
  role: "coach",
  organizationId: "org_123",
});

// Update a member's role
await authClient.organization.updateMemberRole({
  memberId: "member_123",
  role: "parent",
  organizationId: "org_123",
});
```

### Checking Permissions

Use the access control instance to check if a user has permission to perform an action:

```typescript
import { ac } from "@/lib/accessControl";

// Check if the current member's role can create players
const canCreatePlayer = ac.hasPermission(memberRole, "player", "create");

// Check if the current member can manage teams
const canManageTeam = ac.hasPermission(memberRole, "team", "manage");
```

### Using Permissions in Components

```typescript
import { useActiveOrganization } from "better-auth/react";
import { ac } from "@/lib/accessControl";

function TeamManagementButton() {
  const { data: org } = useActiveOrganization();
  const member = org?.member;

  const canManage = member && ac.hasPermission(member.role, "team", "manage");

  if (!canManage) return null;

  return <button>Manage Team</button>;
}
```

## Extending Permissions

To add new permissions:

1. **Update the statement** in both `accessControl.ts` files:

   ```typescript
   const statement = {
     team: ["view", "manage"],
     player: ["view", "create", "update"],
     training: ["view", "create", "update"],
     report: ["view", "create"],
     // Add new resource
     schedule: ["view", "create", "update", "delete"],
   } as const;
   ```

2. **Update role definitions** to grant new permissions:

   ```typescript
   export const coach = ac.newRole({
     team: ["view", "manage"],
     player: ["view", "create", "update"],
     training: ["view", "create", "update"],
     report: ["view", "create"],
     // Add new permission
     schedule: ["view", "create", "update", "delete"],
   });
   ```

3. **Keep both files in sync** - changes must be made to both server and client files

## Adding New Roles

To add a new role (e.g., "admin"):

1. Define it in both `accessControl.ts` files:

   ```typescript
   export const admin = ac.newRole({
     team: ["view", "manage"],
     player: ["view", "create", "update"],
     training: ["view", "create", "update"],
     report: ["view", "create"],
     // Admins get full access
   });
   ```

2. Add it to the roles object in both config files:
   ```typescript
   roles: {
     member,
     coach,
     parent,
     admin, // Add here
   }
   ```

## Important Notes

- **Keep server and client in sync**: The access control statement and roles must be identical on both server and client
- **Default role**: When creating organizations, the creator automatically gets the "owner" role (built-in)
- **Built-in roles**: Better Auth includes "owner", "admin", and "member" by default - these can coexist with your custom roles
- **Type safety**: TypeScript will enforce that you use valid resources and actions defined in your statement

## Resources

- [Better Auth Organization Plugin Docs](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth Access Control Docs](https://www.better-auth.com/docs/plugins/organization#custom-permissions)
