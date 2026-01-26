# Bug Fix: Filters Not Working Correctly on Manage Players Page (#276)

## Issue Summary

### Issue 1: Team Filter Not Working
**Reported Issue**: When using the team filter on the Manage Players page (`/orgs/[orgId]/admin/players`), selecting a specific team shows 0 players, even when players are assigned to that team.

**User Impact**: Admins cannot filter the player list by team, making it difficult to manage players for specific teams when the organization has many players.

### Issue 2: Sport Filter Showing Codes Instead of Names
**Reported Issue**: The Sport filter dropdown displays sport codes (e.g., "GAA_Football" with underscores) instead of friendly names (e.g., "GAA Football").

**User Impact**: The UI is less user-friendly and inconsistent with how sports are displayed elsewhere in the application.

## Root Cause Analysis

### The Problem

The team filter logic was using **attribute matching** instead of checking actual team membership from the database.

**Original Code** (`apps/web/src/app/orgs/[orgId]/admin/players/page.tsx:452-464`):
```typescript
// Team filter - check both players table and teamPlayers junction
let matchesTeam = teamFilter === "all";
// We'll need to implement getPlayerCountByTeam properly later
// For now, just match on sport/ageGroup/gender
if (!matchesTeam && teamFilter !== "all") {
  const selectedTeam = teams?.find((t: any) => t.name === teamFilter);
  if (selectedTeam) {
    matchesTeam =
      player.sport === selectedTeam.sport &&
      player.ageGroup === selectedTeam.ageGroup &&
      player.gender === selectedTeam.gender;
  }
}
```

### Why This Didn't Work

1. **Players are enrolled in organizations, not teams**: The `orgPlayerEnrollments` table tracks which players belong to an organization with their age group. Team assignments are a separate relationship.

2. **Team membership is stored in a junction table**: The `teamPlayerIdentities` table is the source of truth for which players are on which teams.

3. **Attribute matching is unreliable**:
   - A player's sport/ageGroup/gender might not match the team they're assigned to
   - Players can "play up" on teams above their age group
   - Players can be on multiple teams

### Data Model

```
orgPlayerEnrollments ─────┐
(player belongs to org)   │
                          │
playerIdentities ─────────┼──── teamPlayerIdentities ──── teams
(player identity)         │     (junction table)        (team info)
                          │
```

## Solution Implemented

### Changes Made for Team Filter

1. **Added team-player link query**: Fetch actual team membership data using the existing `getTeamMembersForOrg` query from `teamPlayerIdentities.ts`.

2. **Updated filter logic**: Check if the player's `playerIdentityId` exists in the team-player links for the selected team.

3. **Fixed team display**: The "Team(s)" column now shows actual team names instead of just the player's age group.

### Changes Made for Sport Filter

1. **Added sport reference data query**: Fetch sport configurations via `getSports` to get the mapping between sport codes and friendly names.

2. **Created code-to-name mapping**: Built a `Map<string, string>` to efficiently look up friendly names from sport codes.

3. **Updated sport filter dropdown**: Display friendly names in the dropdown while still filtering on sport codes.

4. **Updated Sport column display**: The "Sport" column now shows friendly names in both the table and CSV exports.

### Modified File

`apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`

**New Query Added**:
```typescript
// Get team-player links for proper team filtering
const teamPlayerLinks = useQuery(
  api.models.teamPlayerIdentities.getTeamMembersForOrg,
  { organizationId: orgId }
);
```

**Fixed Filter Logic**:
```typescript
// Team filter - check actual team membership via teamPlayerIdentities
let matchesTeam = teamFilter === "all";
if (!matchesTeam && teamFilter !== "all") {
  const selectedTeam = teams?.find((t: any) => t.name === teamFilter);
  if (selectedTeam) {
    // Check if this player is actually assigned to the selected team
    matchesTeam =
      teamPlayerLinks?.some(
        (link: any) =>
          link.teamId === selectedTeam._id &&
          link.playerIdentityId === player._id
      ) ?? false;
  }
}
```

**Fixed Team Display**:
```typescript
const getPlayerTeams = (player: any) => {
  // Get actual team names from teamPlayerIdentities
  if (!(teamPlayerLinks && teams)) {
    return player.ageGroup ? [player.ageGroup] : ["Unassigned"];
  }

  const playerTeamIds = teamPlayerLinks
    .filter((link: any) => link.playerIdentityId === player._id)
    .map((link: any) => link.teamId);

  if (playerTeamIds.length === 0) {
    return ["Unassigned"];
  }

  const teamNames = teams
    .filter((team: any) => playerTeamIds.includes(team._id))
    .map((team: any) => team.name);

  return teamNames.length > 0 ? teamNames : ["Unassigned"];
};
```

**Sport Reference Data Query**:
```typescript
// Get sport reference data for friendly names
const sportsData = useQuery(api.models.referenceData.getSports);

// Create a mapping from sport code to friendly name
const sportCodeToName = new Map<string, string>(
  sportsData?.map((sport) => [sport.code, sport.name]) ?? []
);

// Helper to get friendly sport name from code
const getSportName = (sportCode: string | null | undefined): string => {
  if (!sportCode || sportCode === "Not assigned") {
    return "Not assigned";
  }
  return sportCodeToName.get(sportCode) ?? sportCode;
};
```

## Manual Verification Steps

### Prerequisites
- Access to an organization as Admin or Owner
- At least one team with players assigned
- Players with sport assignments (sport passports)

### Test 1: Verify Team Filter Works

1. Navigate to `/orgs/[orgId]/admin/players`
2. Note the total player count displayed
3. Use the "Team" filter dropdown and select a specific team
4. **Expected**: Only players assigned to that team are shown (count should decrease)
5. **Expected**: Players not assigned to any team are NOT shown when filtering by a specific team

### Test 2: Verify Team Display

1. Navigate to `/orgs/[orgId]/admin/players`
2. Look at the "Team(s)" column for each player
3. **Expected**: Players with team assignments show actual team names
4. **Expected**: Players without team assignments show "Unassigned"

### Test 3: Verify Multiple Team Assignments

1. Assign a player to multiple teams (via team management)
2. Navigate to `/orgs/[orgId]/admin/players`
3. Filter by one of those teams
4. **Expected**: The player appears in the filtered list
5. Filter by the other team
6. **Expected**: The same player appears in this filtered list too
7. View the "Team(s)" column for that player
8. **Expected**: Shows all team names separated by commas

### Test 4: Verify "All Teams" Filter

1. Navigate to `/orgs/[orgId]/admin/players`
2. Set the Team filter to "All Teams"
3. **Expected**: All enrolled players are shown regardless of team assignment

### Test 5: Verify Sport Filter Shows Friendly Names

1. Navigate to `/orgs/[orgId]/admin/players`
2. Click on the "Sport" filter dropdown
3. **Expected**: Sports are shown with friendly names (e.g., "GAA Football") not codes (e.g., "GAA_Football")
4. Select a sport
5. **Expected**: Players are filtered correctly by that sport

### Test 6: Verify Sport Column Shows Friendly Names

1. Navigate to `/orgs/[orgId]/admin/players`
2. Look at the "Sport" column in the table
3. **Expected**: Sport names are displayed with friendly names, not codes
4. Export the player list to CSV
5. **Expected**: The exported Sport column also contains friendly names

## Technical Notes

### Query Used

The fix uses the existing `getTeamMembersForOrg` query from `packages/backend/convex/models/teamPlayerIdentities.ts`:

```typescript
export const getTeamMembersForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(teamMemberValidator),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }
    return members;
  },
});
```

### Performance Consideration

The team-player links are fetched once per page load and cached by Convex. The filtering is done client-side which is efficient for typical organization sizes.

## PR Reference

**Pull Request**: #358
**Branch**: `fix/276-team-filter-players-page`
