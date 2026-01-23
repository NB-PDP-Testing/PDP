# Voice Note Player Matching - Deduplication Fix

**Date:** 2026-01-22
**Issue:** Players appearing on multiple teams cause duplicate roster entries, leading to "ambiguous match" failures

## Root Cause Analysis

### The Problem
When analyzing voice note `k1759vx4hjprfnp25xczfk49s57zp30f`:

```json
{
  "transcription": "great effort from clodagh this evening...",
  "insights": [{
    "playerName": "Clodagh",  // <-- First name only
    "title": "Excellent Performance by Clodagh"
    // NO playerIdentityId field!
  }]
}
```

**What happened:**
1. AI extracted `playerName: "Clodagh"` but NO player ID
2. Fallback matching tried to match "Clodagh" against roster
3. Found **Clodagh Barlow appeared TWICE** in roster (duplicate entries)
4. Code detected "ambiguous match" (thinks 2 different players)
5. Refused to match → Result: **"Clodagh (not matched)"**

### Why Duplicates?
Clodagh Barlow is on **multiple teams** (U18 Female + Senior Women). Even though `getPlayersForCoachTeamsInternal` uses a Set to deduplicate by `playerIdentityId`, the roster building might still produce duplicates in edge cases.

## Solution Applied

### 1. Roster Deduplication (lines 246-256)
```typescript
// BEFORE: Used players array directly
const rosterContext = JSON.stringify(players.map(...))

// AFTER: Deduplicate by playerIdentityId
const uniquePlayers = Array.from(
  new Map(
    players.map((player: any) => [player.playerIdentityId, player])
  ).values()
);
const rosterContext = JSON.stringify(uniquePlayers.map(...))
```

**Benefits:**
- Guarantees no duplicate players sent to AI
- Prevents "ambiguous match" false positives
- Defense-in-depth approach

### 2. Use Deduplicated Roster for Matching (line 380)
```typescript
// BEFORE
const matchedPlayer = findMatchingPlayer(insight, players);

// AFTER
const matchedPlayer = findMatchingPlayer(insight, uniquePlayers);
```

### 3. Enhanced Logging
- Shows deduplication stats: `Providing X UNIQUE players (deduplicated from Y total)`
- Logs AI response details: playerName and playerId for each insight
- Logs matching failures with roster context

## Testing

### Before Fix
```
Voice Note: "great effort from clodagh this evening..."
Result: ❌ "Clodagh (not matched)" - needs manual assignment
```

### After Fix (Expected)
```
Voice Note: "great effort from clodagh this evening..."
Logs:
  [AI Roster] Providing 25 UNIQUE players (deduplicated from 27 total)
  [AI Response] "Clodagh": playerName="Clodagh", playerId=NULL
  [Player Matching] ✅ First name match: "Clodagh" → Clodagh Barlow
Result: ✅ Matched to Clodagh Barlow (mx7fsvhh9m9v8qayeetcjvn5g17y95dv)
```

## Verification Steps

1. **Record new voice note** mentioning "Clodagh"
2. **Check Convex logs** for:
   - Deduplication stats (should show fewer unique players than total)
   - Successful first name match
3. **Verify in UI** that insight shows "Clodagh Barlow" badge (not "not matched")

## Related Issues

- **AI not extracting full names**: Still an issue (AI returns "Clodagh" not "Clodagh Barlow")
- **AI not extracting player IDs**: Still an issue (AI ignores roster JSON IDs)
- This fix addresses the fallback matching to handle these AI limitations

## Follow-Up Work

### Short Term (Done ✅)
- [x] Deduplicate roster before AI processing
- [x] Use deduplicated roster for fallback matching
- [x] Add deduplication logging

### Medium Term (Recommended)
- [ ] Improve AI prompt to extract full names consistently
- [ ] Test different AI models (gpt-4o vs gpt-4o-mini)
- [ ] Consider two-pass approach (extract names, then match in code)

### Long Term (Optional)
- [ ] Add fuzzy matching for first names
- [ ] Add nickname/common name mappings
- [ ] Context-aware matching (prefer most recent team)

---

**Files Changed:**
- `packages/backend/convex/actions/voiceNotes.ts` (lines 246-290, 380)

**Status:** Ready for testing ✅
