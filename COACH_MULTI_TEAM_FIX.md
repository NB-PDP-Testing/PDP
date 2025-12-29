# Coach Dashboard Multi-Team Display - Implementation

**Date**: December 29, 2025
**Status**: ✅ COMPLETE - Coach dashboard now shows all team memberships with core team indicators

---

## 🐛 The Problem

When coaches viewed their team rosters, players who were assigned to multiple teams (e.g., Clodagh Barlow on both U18 Girls and Senior Women) only showed **one team** in the player listing. The other team memberships were being lost.

### Root Causes

1. **Coach Dashboard Data Loss** (`coach-dashboard.tsx` lines 202-210)
   ```typescript
   // OLD CODE - LOST MULTI-TEAM DATA
   const playerTeams = links.map(...).filter(Boolean) as string[];
   const teamName = playerTeams[0] || "";  // ❌ Only kept first team!

   return {
     ...player,
     teamName,  // Single team only
     team: teamName,
   };
   ```

2. **Display Component Limitation** (`smart-coach-dashboard.tsx`)
   - The `getPlayerTeams` function only returned single team
   - Team cell displayed: `{getPlayerTeams(player).join(", ")}`
   - But `getPlayerTeams` only returned one team anyway!

---

## ✅ The Solution

### Part 1: Preserve All Team Data (coach-dashboard.tsx)

**File**: `/apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`
**Lines**: 193-250

**Changes**:

1. **Get ALL team details** (not just names):
   ```typescript
   const playerTeamDetails = links.map((link: any) => {
     const team = teams.find((t: any) => t._id === link.teamId);
     return team ? {
       teamId: team._id,
       teamName: team.name,
       ageGroup: team.ageGroup,
       sport: team.sport,
     } : null;
   }).filter(Boolean);
   ```

2. **Calculate core team** (team matching player's enrollment age group):
   ```typescript
   const coreTeam = playerTeamDetails.find(
     (t: any) => t.ageGroup?.toLowerCase() === player.ageGroup?.toLowerCase()
   );
   ```

3. **Extract all team names**:
   ```typescript
   const playerTeams = playerTeamDetails.map((t: any) => t.teamName);
   ```

4. **Return enriched player data**:
   ```typescript
   return {
     ...player,
     teamName,              // First team (backwards compatibility)
     team: teamName,        // Alias for compatibility
     teams: playerTeams,    // ✅ ALL team names (array)
     teamDetails: playerTeamDetails,  // Full team details
     coreTeamName: coreTeam?.teamName, // ✅ Core team name
     skills,
   };
   ```

---

### Part 2: Update Display Component (smart-coach-dashboard.tsx)

**File**: `/apps/web/src/components/smart-coach-dashboard.tsx`

**Change 1: Import Shield icon** (line 22):
```typescript
import {
  // ... other icons
  Shield,  // ✅ Added for core team indicator
  // ... other icons
} from "lucide-react";
```

**Change 2: Update getPlayerTeams function** (lines 254-267):
```typescript
const getPlayerTeams = (player: any): string[] => {
  // ✅ First check if player has explicit teams array
  if (player.teams && Array.isArray(player.teams) && player.teams.length > 0) {
    return player.teams;  // Return ALL teams
  }

  // Fallback to single team (backwards compatibility)
  const teamName = player.teamName || player.team;
  if (teamName) {
    return [teamName];
  }
  return [];
};
```

**Change 3: Update team cell display** (lines 1651-1680):
```typescript
<td className="px-4 py-3 text-gray-600 text-sm">
  {getPlayerTeams(player).length > 0 ? (
    <div className="flex flex-wrap items-center gap-1">
      {getPlayerTeams(player).map((teamName, idx) => {
        const isCoreTeam = player.coreTeamName === teamName;
        return (
          <span
            key={`${player._id}-${teamName}-${idx}`}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
              isCoreTeam
                ? "bg-green-100 font-medium text-green-700"  // Green for core team
                : "bg-gray-100 text-gray-700"  // Gray for additional teams
            }`}
            title={
              isCoreTeam
                ? "Core Team (matches age group)"
                : "Additional Team"
            }
          >
            {isCoreTeam && <Shield size={12} />}  {/* Shield icon for core team */}
            {teamName}
          </span>
        );
      })}
    </div>
  ) : (
    "Not assigned"
  )}
</td>
```

---

## 🎨 Visual Design

### Team Badge Styles

**Core Team** (Age group matches enrollment):
- 🟢 Green background (`bg-green-100`)
- 🟢 Green text (`text-green-700`)
- 🛡️ Shield icon
- **Bold** font weight
- Tooltip: "Core Team (matches age group)"

**Additional Teams**:
- ⚪ Gray background (`bg-gray-100`)
- ⚫ Gray text (`text-gray-700`)
- No icon
- Regular font weight
- Tooltip: "Additional Team"

### Example Display

**Player: Clodagh Barlow (U18)**
```
Teams: [🛡️ U18 Girls]  [Senior Women]
       ↑ Core Team     ↑ Additional Team
       (Green)         (Gray)
```

---

## 📊 Data Flow

### Before Fix

```
Player Data → Only First Team → Display Single Team
Clodagh:
  teams: ["U18 Girls", "Senior Women"]
         ↓
  teamName: "U18 Girls"  ❌ Lost "Senior Women"
         ↓
  Display: "U18 Girls"
```

### After Fix

```
Player Data → All Teams + Core Flag → Display All with Indicators
Clodagh:
  teams: ["U18 Girls", "Senior Women"]  ✅ Preserved
  coreTeamName: "U18 Girls"  ✅ Calculated
         ↓
  Display: [🛡️ U18 Girls] [Senior Women]
```

---

## 🧪 Testing

### Test Case: Multi-Team Player

**Player**: Clodagh Barlow
- **Enrollment Age Group**: U18
- **Team 1**: U18 Girls (Core Team - ageGroup matches)
- **Team 2**: Senior Women (Additional Team)

**Expected Display**:
```
[🛡️ U18 Girls]  [Senior Women]
 Green badge     Gray badge
```

**How to Test**:
1. Log in as a coach assigned to both U18 Girls and Senior Women teams
2. Navigate to Coach Dashboard
3. Find Clodagh Barlow in player list
4. Check "Team(s)" column
5. Verify:
   - ✅ Both teams are displayed
   - ✅ U18 Girls has shield icon and green background
   - ✅ Senior Women has gray background (no shield)
   - ✅ Hover tooltips explain core vs additional team

### Test Other Multi-Team Players

**Players to verify**:
- Sinead Haughey (U18 + Senior Women)
- Lauren Mackle (U18 + Senior Women)
- Lucy Traynor (U18 + Senior Women)

All should show:
- Core Team: U18 Girls (🛡️ green)
- Additional: Senior Women (gray)

---

## 🔧 Technical Details

### Files Modified

1. **`/apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`**
   - Lines 193-250: Updated `playersWithTeams` mapping
   - Added: `teams` array, `teamDetails`, `coreTeamName` to player data

2. **`/apps/web/src/components/smart-coach-dashboard.tsx`**
   - Line 22: Added `Shield` import
   - Lines 254-267: Updated `getPlayerTeams` function
   - Lines 1651-1680: Updated team cell rendering with badges

### Core Team Logic

**Definition**: A player's core team is the team where:
```typescript
team.ageGroup === player.enrollmentAgeGroup
```

**Example**:
- Player enrollment: `ageGroup: "U18"`
- Team 1: `{ name: "U18 Girls", ageGroup: "U18" }` → ✅ CORE TEAM
- Team 2: `{ name: "Senior Women", ageGroup: "Senior" }` → Additional team

**Case-Insensitive Matching**:
```typescript
const coreTeam = playerTeamDetails.find(
  (t: any) => t.ageGroup?.toLowerCase() === player.ageGroup?.toLowerCase()
);
```

### Backwards Compatibility

The changes maintain backwards compatibility:

1. **Single-team players**: Work as before
2. **Legacy data format**: Fallback to `player.teamName` or `player.team`
3. **Existing components**: `teamName` field still populated with first team

---

## 🎯 What Works Now

✅ **Multi-Team Display**
- All team memberships show in coach dashboard player list
- Each team appears as a separate badge
- Teams wrap to multiple lines if needed

✅ **Core Team Indicators**
- Green background + shield icon for core team
- Gray background for additional teams
- Tooltips explain the difference

✅ **Team Filtering**
- Coach can still filter by single team
- Filtered view shows only players on that team
- Multi-team players appear when filtering by ANY of their teams

✅ **Backwards Compatibility**
- Single-team players display normally
- Legacy code still works with `teamName` field
- No breaking changes to existing functionality

---

## 📋 User Experience

### Coach View - Team Roster

When a coach clicks on a team (e.g., "U18 Girls"):
1. **Team filter activates**: Only shows players on U18 Girls
2. **Multi-team players included**: Clodagh, Sinead, Lauren, Lucy all appear
3. **Team badges show**: Each player's badge shows they're on U18 Girls (with shield if core)
4. **Other teams visible**: Senior Women badge also shows (gray)

### Coach View - All Players

When viewing all players across all coach's teams:
1. **All players visible**: From all assigned teams
2. **Multi-team players appear once**: Not duplicated
3. **All team badges show**: Each player shows ALL their team memberships
4. **Core team highlighted**: Easy to identify which is their primary team

---

## 🚀 Next Steps

### For Users

The feature is ready to use! Navigate to the coach dashboard and you'll immediately see:
- All team memberships for multi-team players
- Visual indicators (shield icon, green color) for core teams
- Tooltips explaining team types

### For Future Development

**Potential Enhancements**:
1. **Click to filter**: Click a team badge to filter by that team
2. **Team count indicator**: Show "2 teams" badge instead of/alongside team list
3. **Admin override indicators**: Show when player has age eligibility override
4. **Mobile optimization**: Consider collapsing team badges on small screens
5. **Team abbreviations**: Use short codes for long team names (e.g., "SEN W" for "Senior Women")

---

## ✨ Summary

**Problem**: Multi-team players only showed one team in coach dashboard
**Solution**: Updated data flow to preserve all teams + added visual indicators for core teams
**Result**: Coaches now see complete team membership information with clear core team identification

**Status**: ✅ Ready for production use!

---

**Last Updated**: December 29, 2025
**Files Changed**: 2 (coach-dashboard.tsx, smart-coach-dashboard.tsx)
**Lines Changed**: ~60 lines total
**Breaking Changes**: None (backwards compatible)
