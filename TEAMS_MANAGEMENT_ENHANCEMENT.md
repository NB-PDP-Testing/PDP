# Teams Management Enhancement Plan

## Current Status
✅ Teams page exists with basic CRUD operations
✅ Player counts display correctly using `TeamPlayerCount` component
✅ Team filtering and search working
❌ Missing: Player roster display in expanded view
❌ Missing: Add/remove players from teams
❌ Missing: Full player assignment management in edit dialog

## Features to Add from MVP

### 1. Team Roster Display (in expanded section)
**Location:** Inside `<CollapsibleContent>` after team details

**Features:**
- Query players for the specific team using `getPlayersByTeam`
- Display player cards in a grid
- Show player name, initials avatar, age group
- Click to view player details (optional)

**Code Pattern:**
```typescript
// Add this component
function TeamRoster({ teamId }: { teamId: string }) {
  const players = useQuery(api.models.players.getPlayersByTeam, { teamId });
  
  if (!players) return <div>Loading players...</div>;
  
  if (players.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No players assigned</p>
        <Button className="mt-4" onClick={() => /* open edit */}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Players
        </Button>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {players.map((player) => (
        <div key={player._id} className="bg-white border rounded-lg p-3">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <span className="text-sm font-medium text-primary">
                {player.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium truncate w-full text-center">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.ageGroup}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 2. Player Assignment Management (in edit dialog)
**Location:** Inside the edit/create dialog after form fields

**Features:**
- Search all players
- Show current team members (green bg)
- Show pending additions (blue bg)
- Show pending removals (red bg with opacity)
- Click to toggle add/remove
- Save applies all changes via `addPlayerToTeam` and `removePlayerFromTeam` mutations

**State Needed:**
```typescript
const [playerSearch, setPlayerSearch] = useState("");
const [pendingAssignments, setPendingAssignments] = useState<{
  add: string[];
  remove: string[];
}>({ add: [], remove: [] });
```

**Code Pattern:**
```typescript
// Inside dialog, after regular form fields
{editingTeamId && allPlayers && (
  <div className="border-t pt-4 mt-4">
    <Label>Team Members</Label>
    
    {/* Search */}
    <div className="relative mt-2 mb-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Search players..."
        value={playerSearch}
        onChange={(e) => setPlayerSearch(e.target.value)}
        className="pl-10"
      />
    </div>
    
    {/* Player Grid */}
    <div className="max-h-80 overflow-y-auto">
      {(() => {
        // Get current team players
        const teamPlayers = useQuery(api.models.players.getPlayersByTeam, 
          { teamId: editingTeamId }
        );
        
        // Categorize players
        const categorized = allPlayers.map(p => {
          const isOnTeam = teamPlayers?.some(tp => tp._id === p._id);
          const isBeingAdded = pendingAssignments.add.includes(p._id);
          const isBeingRemoved = pendingAssignments.remove.includes(p._id);
          
          let status: 'assigned' | 'adding' | 'removing' | 'available';
          if (isBeingAdded) status = 'adding';
          else if (isBeingRemoved) status = 'removing';
          else if (isOnTeam) status = 'assigned';
          else status = 'available';
          
          return { ...p, status };
        });
        
        // Filter by search
        const filtered = categorized.filter(p => {
          if (!playerSearch) return true;
          return p.name.toLowerCase().includes(playerSearch.toLowerCase());
        });
        
        // Sort: assigned first, then adding, then removing, then available
        const sorted = filtered.sort((a, b) => {
          const order = { assigned: 0, adding: 1, removing: 2, available: 3 };
          return order[a.status] - order[b.status];
        });
        
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sorted.map(player => (
              <button
                key={player._id}
                type="button"
                onClick={() => {
                  if (player.status === 'assigned') {
                    setPendingAssignments(prev => ({
                      ...prev,
                      remove: [...prev.remove, player._id]
                    }));
                  } else if (player.status === 'adding') {
                    setPendingAssignments(prev => ({
                      ...prev,
                      add: prev.add.filter(id => id !== player._id)
                    }));
                  } else if (player.status === 'removing') {
                    setPendingAssignments(prev => ({
                      ...prev,
                      remove: prev.remove.filter(id => id !== player._id)
                    }));
                  } else {
                    setPendingAssignments(prev => ({
                      ...prev,
                      add: [...prev.add, player._id]
                    }));
                  }
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  player.status === 'assigned' 
                    ? 'bg-green-50 border-green-300' :
                  player.status === 'adding'
                    ? 'bg-blue-50 border-blue-300' :
                  player.status === 'removing'
                    ? 'bg-red-50 border-red-300 opacity-60' :
                  'bg-white border-gray-200 hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {player.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.ageGroup}</p>
                  </div>
                  {player.status === 'assigned' || player.status === 'adding' ? (
                    <UserMinus className="w-4 h-4 text-red-500" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
    
    <p className="text-xs text-muted-foreground mt-2">
      Tap to toggle • Green = on team • Blue = adding • Red = removing
    </p>
  </div>
)}
```

### 3. Update handleSubmit to Process Player Assignments
**Add this logic after team update:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... existing validation ...
  
  setLoading(true);
  try {
    // Create or update team
    if (editingTeamId) {
      await updateTeamMutation({ /* existing params */ });
    } else {
      await createTeamMutation({ /* existing params */ });
    }
    
    // Process player assignments if editing
    if (editingTeamId) {
      // Add new players
      for (const playerId of pendingAssignments.add) {
        await addPlayerToTeamMutation({
          playerId: playerId as Id<"players">,
          teamId: editingTeamId,
        });
      }
      
      // Remove players
      for (const playerId of pendingAssignments.remove) {
        await removePlayerFromTeamMutation({
          playerId: playerId as Id<"players">,
          teamId: editingTeamId,
        });
      }
    }
    
    toast.success(`${formData.name} has been ${editingTeamId ? 'updated' : 'created'} successfully.`);
    setFormDialogOpen(false);
    setPendingAssignments({ add: [], remove: [] });
    setPlayerSearch("");
  } catch (error: any) {
    // ... error handling ...
  } finally {
    setLoading(false);
  }
};
```

## Implementation Steps

1. ✅ Add mutations to component
   - `addPlayerToTeamMutation`
   - `removePlayerFromTeamMutation`
   
2. ✅ Add state for player management
   - `playerSearch`
   - `pendingAssignments`
   - `editingTeamName` (to track which team we're editing)

3. ⏳ Create `TeamRoster` component
   - Queries players by team
   - Displays in grid
   - Shows empty state

4. ⏳ Add roster display to expanded team section
   - Place after team details
   - Include "Manage Members" button

5. ⏳ Enhance edit dialog with player assignment
   - Add player search input
   - Show categorized player grid
   - Handle click to toggle assignments

6. ⏳ Update `handleSubmit`
   - Process pending additions
   - Process pending removals
   - Clear state after save

7. ⏳ Update `openCreateDialog` and `openEditDialog`
   - Reset player search
   - Reset pending assignments
   - Set editingTeamName

## Backend Queries/Mutations Used

- ✅ `api.models.players.getPlayersByTeam` - Get players for a team
- ✅ `api.models.players.getPlayersByOrganization` - Get all players for assignment
- ✅ `api.models.players.addPlayerToTeam` - Add player to team
- ✅ `api.models.players.removePlayerFromTeam` - Remove player from team

All of these already exist in the backend!

## Testing Checklist

- [ ] Can view team roster in expanded section
- [ ] Empty state shows when no players
- [ ] Can search for players in edit dialog
- [ ] Can add players to team
- [ ] Can remove players from team
- [ ] Pending changes show correct visual state
- [ ] Save button processes all assignments
- [ ] Toast notifications show success/error
- [ ] Player counts update after changes

## Notes

The MVP has all this functionality working. The key differences in the main app:
- Uses shadcn/ui components instead of custom styled divs
- Uses Convex queries/mutations (already implemented in backend)
- Uses `teamPlayers` junction table (already set up)
- Better TypeScript typing with `Id<"players">` types

The backend is already fully set up - we just need to wire up the UI!

