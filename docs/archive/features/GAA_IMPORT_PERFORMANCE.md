# GAA Import Performance Optimization

## Current Problem

**Import speed for 238 players: 48-95 seconds** ❌

### Root Causes

1. **Sequential Processing** (line 1082)
   ```typescript
   for (let i = 0; i < parsedMembers.length; i++) {
     await createPlayerMutation(player);  // Waits for each player
   }
   ```

2. **Individual Mutations** 
   - 238 × `createPlayerMutation` 
   - 238 × `addPlayerToTeam` (called in wrapper)
   - = **476 sequential database operations**

3. **Network Latency**
   - Each mutation: ~100-200ms
   - Total: 238 × 200ms = **47+ seconds minimum**

---

## Solution 1: Parallel Batch Processing (Quick Win)

**Estimated improvement: 10-20x faster (5-10 seconds for 238 players)**

### Implementation

**File:** `apps/web/src/components/gaa-import.tsx`

Replace the `createPassports` function (lines 1074-1303):

```typescript
const createPassports = async () => {
  setImporting(true);
  let created = 0;
  let skipped = 0;
  let replaced = 0;
  const familyMap = new Map<string, string>();
  const playerIds: string[] = [];

  // Phase 1: Handle deletions (for "replace" resolutions)
  const deletions = [];
  for (let i = 0; i < parsedMembers.length; i++) {
    const resolution = duplicateResolutions[i];
    
    if (resolution === "skip" || resolution === "keep") {
      skipped++;
      continue;
    }
    
    if (resolution === "replace") {
      const duplicate = duplicates.find((d) => d.index === i);
      if (duplicate?.existingPlayer._id) {
        deletions.push(
          deletePlayerMutation({ id: duplicate.existingPlayer._id })
            .then(() => { replaced++; })
        );
      }
    }
  }
  
  // Wait for all deletions to complete
  if (deletions.length > 0) {
    await Promise.all(deletions);
  }

  // Phase 2: Prepare all player data (fast, no I/O)
  const playersToCreate = [];
  for (let i = 0; i < parsedMembers.length; i++) {
    const resolution = duplicateResolutions[i];
    
    // Skip if user chose to skip or keep
    if (resolution === "skip" || resolution === "keep") {
      continue;
    }

    const member = parsedMembers[i];
    
    // Create family ID
    const address = (member.Address || "").toLowerCase().trim().replace(/\s+/g, "");
    const postcode = (member.Postcode || "").toLowerCase().trim().replace(/\s+/g, "");
    const familyKey = `${address}_${postcode}`;

    let familyId = familyMap.get(familyKey);
    if (!familyId) {
      familyId = `family_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
      familyMap.set(familyKey, familyId);
    }

    // Determine skills
    let skills: Record<string, number>;
    if (skillRatingStrategy === "blank") {
      skills = {
        soloing: 1, kickingLong: 1, kickingShort: 1,
        freeTakingGround: 1, freeTakingHand: 1, handPassing: 1,
        pickupToeLift: 1, highCatching: 1, tackling: 1,
        positionalSense: 1, tracking: 1, decisionMaking: 1,
        decisionSpeed: 1, ballHandling: 1, leftSide: 1, rightSide: 1,
      };
    } else if (skillRatingStrategy === "middle") {
      skills = {
        soloing: 3, kickingLong: 3, kickingShort: 3,
        freeTakingGround: 3, freeTakingHand: 3, handPassing: 3,
        pickupToeLift: 3, highCatching: 3, tackling: 3,
        positionalSense: 3, tracking: 3, decisionMaking: 3,
        decisionSpeed: 3, ballHandling: 3, leftSide: 3, rightSide: 3,
      };
    } else {
      const ageSkills = getAgeAppropriateSkills(member.AgeGroup);
      skills = {};
      for (const [key, value] of Object.entries(ageSkills)) {
        if (typeof value === "number") {
          skills[key] = value;
        }
      }
    }

    const assignedTeamId = teamAssignments[i];
    if (!assignedTeamId) {
      console.error(`No team assigned for ${member.FullName}`);
      skipped++;
      continue;
    }

    const player: PlayerCreateData = {
      name: member.FullName,
      ageGroup: member.AgeGroup,
      sport: "GAA Football",
      gender: member.Gender,
      teamId: assignedTeamId,
      completionDate: new Date().toISOString().split("T")[0],
      season: "2025",
      reviewedWith: {
        coach: false, parent: false, player: false, forum: false,
      },
      attendance: { training: "", matches: "" },
      injuryNotes: "",
      reviewStatus: "Not Started" as ReviewStatus,
      lastReviewDate: null,
      nextReviewDue: null,
      skills,
      positions: {
        favourite: "", leastFavourite: "",
        coachesPref: "", dominantSide: "", goalkeeper: "",
      },
      fitness: {
        pushPull: "", core: "", endurance: "", speed: "", broncoBeep: "",
      },
      otherInterests: "",
      communications: "",
      actions: "",
      coachNotes: `Imported from membership database
${member.ParentFirstName ? `Parent: ${member.ParentFirstName} ${member.ParentSurname}` : member.ParentSurname ? `Parent/Guardian: ${member.ParentSurname}` : "Parent: Unknown"}
Contact: ${member.ParentEmail || "No email"}
Phone: ${member.ParentPhone || "No phone"}
Address: ${member.Address || ""}, ${member.Town || ""} ${member.Postcode || ""}`.trim(),
      parentNotes: "",
      playerNotes: "",
      seasonReviews: [],
      createdFrom: "GAA Membership Import",
      familyId,
      inferredParentFirstName: member.ParentFirstName || undefined,
      inferredParentSurname: member.ParentSurname || undefined,
      inferredParentEmail: member.ParentEmail?.toLowerCase().trim() || undefined,
      inferredParentPhone: member.ParentPhone || undefined,
      inferredFromSource: `GAA Membership Import ${new Date().toISOString().split("T")[0]}`,
      parentFirstName: member.ParentFirstName || undefined,
      parentSurname: member.ParentSurname || undefined,
      parentEmail: member.ParentEmail || undefined,
      parentPhone: member.ParentPhone || undefined,
      dateOfBirth: member.DateOfBirth || undefined,
      address: member.Address || undefined,
      town: member.Town || undefined,
      postcode: member.Postcode || undefined,
    };

    playersToCreate.push(player);
  }

  // Phase 3: Create all players in parallel batches
  const BATCH_SIZE = 25; // Create 25 players at a time
  const batches = [];
  
  for (let i = 0; i < playersToCreate.length; i += BATCH_SIZE) {
    batches.push(playersToCreate.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Creating ${playersToCreate.length} players in ${batches.length} batches of ${BATCH_SIZE}`);

  for (const batch of batches) {
    try {
      // Process entire batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (player) => {
          try {
            const playerId = await createPlayerMutation(player);
            playerIds.push(playerId);
            created++;
            return { success: true, playerId, name: player.name };
          } catch (error) {
            console.error(`❌ Failed to create ${player.name}:`, error);
            return { success: false, error, name: player.name };
          }
        })
      );

      // Log batch completion
      const successful = batchResults.filter(r => r.success).length;
      console.log(`✅ Batch complete: ${successful}/${batch.length} players created`);
      
    } catch (error) {
      console.error("❌ Batch error:", error);
    }
  }

  // Log audit
  const filterDesc =
    importFilter === "all"
      ? "all players"
      : importFilter === "youth"
        ? "youth players only"
        : "senior players only";
  
  console.log("[AUDIT] BULK_IMPORT", {
    message: `Imported ${created} player passports from GAA membership database (${filterDesc})`,
    user: "Admin",
    recordCount: created,
    familyCount: familyMap.size,
    playerIds,
    fileName: "membership_import.csv",
    metadata: {
      importSource: "GAA Membership Wizard",
      skillRatingStrategy,
      importFilter,
      teams: Array.from(new Set(Object.values(teamAssignments))),
    },
    priority: "high",
  });

  setResults({ created, families: familyMap.size, skipped, replaced });
  setImporting(false);
  setStep(3);
  await onComplete();
};
```

### Key Improvements

1. **Parallel Processing**: Uses `Promise.all()` to process 25 players simultaneously
2. **Batching**: Breaks 238 players into ~10 batches to avoid overwhelming the backend
3. **Error Handling**: Individual player failures don't stop the entire import
4. **Progress Logging**: Console shows batch progress
5. **Preparation Phase**: Prepares all data upfront (fast) before hitting database

### Performance Gain

**Before:** 238 sequential operations = 47+ seconds
**After:** 10 batches × 2 seconds = **~20 seconds** ⚡

---

## Solution 2: Backend Bulk Import (Best Performance)

**Estimated improvement: 20-50x faster (2-5 seconds for 238 players)**

### Create Bulk Import Mutation

**File:** `packages/backend/convex/models/players.ts`

Add this new mutation:

```typescript
/**
 * Bulk import players - optimized for large imports
 * Creates multiple players and team assignments in a single transaction
 */
export const bulkImportPlayers = mutation({
  args: {
    players: v.array(
      v.object({
        name: v.string(),
        ageGroup: v.string(),
        sport: v.string(),
        gender: v.string(),
        organizationId: v.string(),
        season: v.string(),
        teamId: v.string(), // For team assignment
        completionDate: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        address: v.optional(v.string()),
        town: v.optional(v.string()),
        postcode: v.optional(v.string()),
        parentFirstName: v.optional(v.string()),
        parentSurname: v.optional(v.string()),
        parentEmail: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        skills: v.optional(v.record(v.string(), v.number())),
        familyId: v.optional(v.string()),
        inferredParentFirstName: v.optional(v.string()),
        inferredParentSurname: v.optional(v.string()),
        inferredParentEmail: v.optional(v.string()),
        inferredParentPhone: v.optional(v.string()),
        inferredFromSource: v.optional(v.string()),
        createdFrom: v.optional(v.string()),
        coachNotes: v.optional(v.string()),
        reviewedWith: v.optional(
          v.object({
            coach: v.boolean(),
            parent: v.boolean(),
            player: v.boolean(),
            forum: v.boolean(),
          })
        ),
        attendance: v.optional(
          v.object({
            training: v.string(),
            matches: v.string(),
          })
        ),
        positions: v.optional(
          v.object({
            favourite: v.string(),
            leastFavourite: v.string(),
            coachesPref: v.string(),
            dominantSide: v.string(),
            goalkeeper: v.string(),
          })
        ),
        fitness: v.optional(
          v.object({
            pushPull: v.string(),
            core: v.string(),
            endurance: v.string(),
            speed: v.string(),
            broncoBeep: v.string(),
          })
        ),
        injuryNotes: v.optional(v.string()),
        otherInterests: v.optional(v.string()),
        communications: v.optional(v.string()),
        actions: v.optional(v.string()),
        parentNotes: v.optional(v.string()),
        playerNotes: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    created: v.number(),
    playerIds: v.array(v.id("players")),
  }),
  handler: async (ctx, args) => {
    const playerIds: Id<"players">[] = [];
    const teamAssignments: Array<{ playerId: Id<"players">; teamId: string }> = [];

    // Create all players
    for (const playerData of args.players) {
      const playerId = await ctx.db.insert("players", {
        name: playerData.name,
        ageGroup: playerData.ageGroup,
        sport: playerData.sport,
        gender: playerData.gender,
        organizationId: playerData.organizationId,
        season: playerData.season,
        completionDate: playerData.completionDate,
        dateOfBirth: playerData.dateOfBirth,
        address: playerData.address,
        town: playerData.town,
        postcode: playerData.postcode,
        parentFirstName: playerData.parentFirstName,
        parentSurname: playerData.parentSurname,
        parentEmail: playerData.parentEmail,
        parentPhone: playerData.parentPhone,
        skills: playerData.skills ?? {},
        familyId: playerData.familyId,
        inferredParentFirstName: playerData.inferredParentFirstName,
        inferredParentSurname: playerData.inferredParentSurname,
        inferredParentEmail: playerData.inferredParentEmail,
        inferredParentPhone: playerData.inferredParentPhone,
        inferredFromSource: playerData.inferredFromSource,
        createdFrom: playerData.createdFrom,
        coachNotes: playerData.coachNotes,
        reviewedWith: playerData.reviewedWith,
        attendance: playerData.attendance,
        positions: playerData.positions,
        fitness: playerData.fitness,
        injuryNotes: playerData.injuryNotes,
        otherInterests: playerData.otherInterests,
        communications: playerData.communications,
        actions: playerData.actions,
        parentNotes: playerData.parentNotes,
        playerNotes: playerData.playerNotes,
        reviewStatus: "Not Started",
      });

      playerIds.push(playerId);
      teamAssignments.push({ playerId, teamId: playerData.teamId });
    }

    // Create all team assignments
    for (const assignment of teamAssignments) {
      // Check if already exists
      const existing = await ctx.db
        .query("teamPlayers")
        .withIndex("by_teamId", (q) => q.eq("teamId", assignment.teamId))
        .collect();

      const alreadyLinked = existing.find(
        (link) => link.playerId === assignment.playerId
      );

      if (!alreadyLinked) {
        await ctx.db.insert("teamPlayers", {
          teamId: assignment.teamId,
          playerId: assignment.playerId,
          createdAt: Date.now(),
        });
      }
    }

    return {
      created: playerIds.length,
      playerIds,
    };
  },
});
```

### Update Frontend to Use Bulk Import

**File:** `apps/web/src/components/gaa-import.tsx`

Simplified `createPassports`:

```typescript
const createPassports = async () => {
  setImporting(true);
  let skipped = 0;
  let replaced = 0;
  const familyMap = new Map<string, string>();

  // Phase 1: Handle deletions
  const deletions = [];
  for (let i = 0; i < parsedMembers.length; i++) {
    const resolution = duplicateResolutions[i];
    
    if (resolution === "replace") {
      const duplicate = duplicates.find((d) => d.index === i);
      if (duplicate?.existingPlayer._id) {
        deletions.push(
          deletePlayerMutation({ id: duplicate.existingPlayer._id })
            .then(() => { replaced++; })
        );
      }
    } else if (resolution === "skip" || resolution === "keep") {
      skipped++;
    }
  }
  
  if (deletions.length > 0) {
    await Promise.all(deletions);
  }

  // Phase 2: Prepare all players
  const playersToCreate = [];
  // ... (same preparation logic as before) ...

  // Phase 3: Bulk import all at once!
  try {
    const result = await bulkImportPlayersMutation({
      players: playersToCreate,
    });

    console.log(`✅ Bulk import complete: ${result.created} players created`);

    setResults({ 
      created: result.created, 
      families: familyMap.size, 
      skipped, 
      replaced 
    });
  } catch (error) {
    console.error("❌ Bulk import failed:", error);
    toast.error("Import failed. Please try again.");
  }

  setImporting(false);
  setStep(3);
  await onComplete();
};
```

### Performance Gain

**Before:** 238 sequential operations = 47+ seconds
**After:** 1 bulk operation = **2-5 seconds** ⚡⚡⚡

---

## Recommended Implementation

**Start with Solution 1 (Parallel Batching)** - Quick to implement, 10-20x faster

**Later, add Solution 2 (Bulk Import)** - Maximum performance, 20-50x faster

---

## Additional Optimizations

### 1. Add Progress Indicator

Show which batch is processing:

```typescript
// In state
const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

// In createPassports
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  setImportProgress({ current: batchIndex + 1, total: batches.length });
  // ... process batch ...
}
```

Update UI to show:
```typescript
{importing && (
  <div className="...">
    <p>Creating Player Passports...</p>
    <p className="text-sm">
      Batch {importProgress.current} of {importProgress.total}
    </p>
    <div className="mt-2 h-2 w-full bg-gray-200 rounded">
      <div 
        className="h-full bg-green-600 rounded transition-all"
        style={{ 
          width: `${(importProgress.current / importProgress.total) * 100}%` 
        }}
      />
    </div>
  </div>
)}
```

### 2. Optimize Family ID Generation

```typescript
// Before (inside loop, Date.now() can create duplicates)
familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// After (unique counter)
let familyCounter = 0;
familyId = `family_${Date.now()}_${familyCounter++}`;
```

### 3. Pre-calculate Skills

Move skill generation outside the loop:

```typescript
const getSkillsForStrategy = (strategy: string, ageGroup: string) => {
  // Calculate once, reuse for all players
};

const skillsByAgeGroup = new Map();
```

---

## Performance Comparison

| Method | Time for 238 Players | Improvement |
|--------|---------------------|-------------|
| **Current (Sequential)** | 48-95 seconds | Baseline |
| **Solution 1 (Parallel Batches)** | 5-10 seconds | **10-20x faster** ⚡ |
| **Solution 2 (Bulk Import)** | 2-5 seconds | **20-50x faster** ⚡⚡⚡ |

---

## Implementation Checklist

### Solution 1 (Quick Win)
- [ ] Update `createPassports` function with parallel batching
- [ ] Add batch size constant (25-50 players)
- [ ] Add error handling per player
- [ ] Add progress indicator
- [ ] Test with 238 players
- [ ] Verify all players created
- [ ] Verify team assignments created

### Solution 2 (Maximum Performance)
- [ ] Create `bulkImportPlayers` backend mutation
- [ ] Add bulk import to frontend
- [ ] Update page.tsx to use bulk mutation
- [ ] Test with 238 players
- [ ] Verify transaction integrity
- [ ] Add rollback on failure

---

## Expected Results

**Before optimization:**
```
⏱️ Importing 238 players...
[48 seconds later...]
✅ Complete!
```

**After Solution 1:**
```
⏱️ Importing 238 players...
📦 Creating 238 players in 10 batches of 25
✅ Batch 1/10 complete: 25/25 players created
✅ Batch 2/10 complete: 25/25 players created
...
[8 seconds later...]
✅ Complete! 238 players imported
```

**After Solution 2:**
```
⏱️ Importing 238 players...
📦 Bulk importing 238 players...
[3 seconds later...]
✅ Complete! 238 players imported
```

Much better! 🚀

