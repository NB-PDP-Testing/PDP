# Fix Coach Assignments Data

## Problem

The `coachAssignments.teams` array contains:
1. Team **NAMES** ("Senior Women", "U18 Female") - from Users admin page
2. Player **IDs** ("js79xewp66skzqe3tv8r0ztd457y9qeh") - corruption
3. Should contain: Better Auth **team IDs** (like "jh7...")

## Current Data

From inspection query:
```json
[
  {
    "_id": "kn7dmtj0qkhda324xwsa4yvsgd7y97xd",
    "userId": "k175sxnms1s6r8z66qdya70cb97w89d7",
    "organizationId": "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
    "teams": ["Senior Women", "U18 Female"]
  },
  {
    "_id": "kn762sy375svwe19wppb5emhnh7z1emf",
    "userId": "k17fwp081bcxjyxcv4t43xq7997z1py1",
    "organizationId": "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7",
    "teams": ["js79xewp66skzqe3tv8r0ztd457y9qeh"]  ← PLAYER ID
  }
]
```

## Manual Fix Steps (Convex Dashboard)

### Step 1: Get Team IDs

Query to get team IDs for this org:
```
SELECT * FROM team WHERE organizationId = "jh7f6k14jw7j4sj9rr9dfzekr97xm9j7"
```

Expected results:
- "Senior Women" team → team ID: `jh7...`
- "U18 Female" team → team ID: `jh7...`

### Step 2: Fix Neil's Assignment (Player ID Issue)

User: `neil.b@blablablak.com` (userId: `k17fwp081bcxjyxcv4t43xq7997z1py1`)

Current:
```json
{
  "_id": "kn762sy375svwe19wppb5emhnh7z1emf",
  "teams": ["js79xewp66skzqe3tv8r0ztd457y9qeh"]
}
```

**Action**: Look up what team player `js79xewp66skzqe3tv8r0ztd457y9qeh` belongs to:
```
SELECT * FROM teamPlayerIdentities WHERE playerIdentityId = "js79xewp66skzqe3tv8r0ztd457y9qeh"
```

Then update the assignment with the correct team ID.

### Step 3: Fix All Other Assignments

For each assignment with team names:
1. Find the team by name in the `team` table
2. Get its `_id`
3. Update the `coachAssignments` record

## Quick Fix Script (Run in Convex Dashboard)

```typescript
// In Convex Dashboard > Functions > Run
// Call: inspectAndFixCoachAssignments

import { mutation } from "./_generated/server";

export const inspectAndFixCoachAssignments = mutation({
  handler: async (ctx) => {
    const assignments = await ctx.db.query("coachAssignments").collect();
    const report = [];

    for (const assignment of assignments) {
      const oldTeams = assignment.teams;
      const newTeams = [];

      for (const teamValue of assignment.teams) {
        // Try to find by Better Auth team _id
        const teamById = await ctx.db
          .query("team")
          .filter((q) => q.eq(q.field("_id"), teamValue))
          .first();

        if (teamById) {
          // It's already a valid team ID
          newTeams.push(teamById._id);
          continue;
        }

        // Try to find by team name
        const teamByName = await ctx.db
          .query("team")
          .filter((q) =>
            q.and(
              q.eq(q.field("name"), teamValue),
              q.eq(q.field("organizationId"), assignment.organizationId)
            )
          )
          .first();

        if (teamByName) {
          // Found by name, use its ID
          newTeams.push(teamByName._id);
          continue;
        }

        // Maybe it's a player ID? Look up their team
        const playerMemberships = await ctx.db
          .query("teamPlayerIdentities")
          .filter((q) => q.eq(q.field("playerIdentityId"), teamValue))
          .collect();

        if (playerMemberships.length > 0) {
          // Add all teams this player belongs to
          for (const membership of playerMemberships) {
            if (membership.status === "active") {
              newTeams.push(membership.teamId);
            }
          }
        }
      }

      // Deduplicate
      const uniqueTeams = [...new Set(newTeams)];

      // Update if changed
      if (JSON.stringify(oldTeams.sort()) !== JSON.stringify(uniqueTeams.sort())) {
        await ctx.db.patch(assignment._id, {
          teams: uniqueTeams
        });

        report.push({
          userId: assignment.userId,
          oldTeams,
          newTeams: uniqueTeams,
          fixed: true
        });
      } else {
        report.push({
          userId: assignment.userId,
          oldTeams,
          newTeams: uniqueTeams,
          fixed: false
        });
      }
    }

    return {
      totalAssignments: assignments.length,
      assignmentsFixed: report.filter(r => r.fixed).length,
      report
    };
  }
});
```

## After Migration

1. Refresh Team Hub page
2. Should see teams in dropdown
3. No more player ID errors
4. All coach pages should work

## Root Cause Fix

**File**: `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`
**Lines**: 469-492

Remove the ID→name conversion:
```typescript
// DELETE THIS:
const teamNames = (state.teams || [])
  .map((teamIdOrName: string) => {
    const teamById = teams?.find((t: any) => t._id === teamIdOrName);
    if (teamById) {
      return teamById.name; // ← WRONG!
    }
    return teamIdOrName;
  })

// REPLACE WITH:
const teamIds = state.teams || [];
```

Then pass `teamIds` directly to the mutation without conversion.
