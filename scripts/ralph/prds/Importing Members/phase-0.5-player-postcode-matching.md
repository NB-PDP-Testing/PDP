# Phase 0.5: Player Postcode Matching Enhancement

**Timeline**: 1-2 days
**Status**: Ready for Implementation
**Dependencies**: Phase 0 (Onboarding Sync) - COMPLETE

---

## Problem Statement

The current guardian matching algorithm (Phase 0) matches self-registering users to guardian identities using multiple signals including postcode. However, it does not consider the **player identity's postcode** as an additional matching signal.

### Real-World Scenario

Consider a separated family:
- **Child (Emma)**: Lives primarily with mum in Dublin (D02 AF30)
- **Guardian 1 (Mum)**: Lives in Dublin (D02 AF30)
- **Guardian 2 (Dad)**: Lives in Cork (T12 XY45)

Current behavior:
- Import creates player identity with postcode D02 AF30
- Import creates guardian identities, but copies player's postcode to BOTH guardians (incorrect for dad)
- When dad registers with T12 XY45, postcode matching fails

### Desired Behavior

1. Player identity has their own postcode (where child primarily lives)
2. Each guardian can have a different postcode
3. Matching algorithm uses player postcode as additional confirmation signal

---

## Objectives

1. Enhance guardian matching to include player postcode as a matching signal
2. Add player postcode matching to improve confidence in guardian-child relationships
3. Maintain backward compatibility with existing matching logic

---

## Success Criteria

- [ ] Matching algorithm considers player identity postcode
- [ ] When user matches guardian, linked player postcodes provide bonus confidence
- [ ] Existing email/phone/postcode matching continues to work
- [ ] No regression in matching accuracy
- [ ] Type checks pass: `npm run check-types`
- [ ] Linting passes: `npx ultracite fix`

---

## Technical Implementation

### 1. Update Guardian Matcher (`guardianMatcher.ts`)

**File**: `/packages/backend/convex/lib/matching/guardianMatcher.ts`

#### New Matching Weight

Add to `MATCHING_WEIGHTS`:
```typescript
export const MATCHING_WEIGHTS = {
  EMAIL_EXACT: 50,
  SURNAME_POSTCODE: 45,
  SURNAME_TOWN: 35,
  PHONE: 30,
  POSTCODE_ONLY: 20,
  TOWN_ONLY: 10,
  HOUSE_NUMBER: 5,
  PLAYER_POSTCODE_BONUS: 10,  // NEW: Bonus when user postcode matches linked player
};
```

#### New Function: `checkPlayerPostcodeMatch`

```typescript
/**
 * Check if user's postcode matches any linked player's postcode.
 * This provides additional confidence that the user is related to the guardian.
 *
 * @param ctx - Query context
 * @param guardianId - Guardian identity ID
 * @param userPostcode - User's provided postcode (normalized)
 * @returns Object with match status and matched player names
 */
export async function checkPlayerPostcodeMatch(
  ctx: QueryCtx,
  guardianId: Id<"guardianIdentities">,
  userPostcode: string
): Promise<{ matches: boolean; matchedPlayers: string[] }> {
  // Get all active guardian-player links
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardianId))
    .filter((q) => q.neq(q.field("status"), "declined"))
    .collect();

  const matchedPlayers: string[] = [];

  for (const link of links) {
    const player = await ctx.db.get(link.playerIdentityId);
    if (player?.postcode) {
      const playerPostcode = normalizePostcode(player.postcode);
      if (playerPostcode === userPostcode) {
        matchedPlayers.push(`${player.firstName} ${player.lastName}`);
      }
    }
  }

  return {
    matches: matchedPlayers.length > 0,
    matchedPlayers,
  };
}
```

#### Update `calculateMatchScore`

Modify the score calculation to include player postcode bonus:

```typescript
// After existing scoring logic, add:

// Check player postcode match for bonus points
if (params.postcode && guardian._id) {
  const playerPostcodeResult = await checkPlayerPostcodeMatch(
    ctx,
    guardian._id,
    normalizePostcode(params.postcode)
  );

  if (playerPostcodeResult.matches) {
    score += MATCHING_WEIGHTS.PLAYER_POSTCODE_BONUS;
    matchReasons.push(
      `Postcode matches linked player(s): ${playerPostcodeResult.matchedPlayers.join(", ")}`
    );
  }
}
```

### 2. Update Match Reasons Display

**File**: `/apps/web/src/components/onboarding/unified-guardian-claim-step.tsx`

Ensure the match reasons display includes the new player postcode match reason for transparency.

### 3. Update Return Types

The `GuardianMatch` type should include the player postcode match information:

```typescript
export type GuardianMatch = {
  guardian: GuardianIdentity;
  score: number;
  confidence: "high" | "medium" | "low";
  matchReasons: string[];
  linkedPlayers: Array<{
    id: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    postcodeMatches?: boolean;  // NEW
  }>;
};
```

---

## Database Changes

**None required** - Player identity already has postcode field, it just needs to be used in matching.

---

## Testing Requirements

### Unit Tests

1. **Player postcode match function**:
   - Guardian with one linked player, postcode matches → returns true
   - Guardian with multiple linked players, one matches → returns true with correct player
   - Guardian with linked players, no postcode match → returns false
   - Guardian with no linked players → returns false
   - Player has no postcode → skipped in comparison

2. **Score calculation with player postcode**:
   - Base match + player postcode bonus = correct total
   - Match reasons include player postcode info

### Integration Tests

1. **Scenario: Matching with player postcode confirmation**
   - Import player (Emma) with postcode D02 AF30
   - Import guardian (Mum) with different postcode D04 XY00
   - User registers with D02 AF30 and surname match
   - Verify: Match includes "Postcode matches linked player" reason
   - Verify: Score includes PLAYER_POSTCODE_BONUS

2. **Scenario: Separated parents**
   - Import player with postcode D02 AF30 (lives with mum)
   - Guardian 1 (mum): D02 AF30
   - Guardian 2 (dad): T12 XY45
   - Dad registers with T12 XY45
   - Verify: Dad matches to Guardian 2 via existing logic
   - Verify: No player postcode bonus (postcodes don't match)

### Manual UAT

1. Register new user with postcode matching a linked player
2. Verify claim step shows match reason including player name
3. Register new user with postcode NOT matching linked player
4. Verify matching still works via other signals (email, phone)

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/backend/convex/lib/matching/guardianMatcher.ts` | Add `PLAYER_POSTCODE_BONUS` weight, `checkPlayerPostcodeMatch` function, update score calculation |
| `apps/web/src/components/onboarding/unified-guardian-claim-step.tsx` | Display new match reason (no code change if already showing all reasons) |

---

## Rollout Plan

1. Deploy backend changes (matching algorithm)
2. Test in development environment
3. Deploy to staging for UAT
4. Monitor matching accuracy metrics
5. Deploy to production

---

## Definition of Done

- [ ] `checkPlayerPostcodeMatch` function implemented and tested
- [ ] `calculateMatchScore` updated to include player postcode bonus
- [ ] Match reasons display player postcode match information
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual UAT complete
- [ ] Type checks pass
- [ ] Linting passes
- [ ] Code review approved

---

## Future Considerations (Phase 1+)

This enhancement works with the existing import data. However, Phase 1 should address:

1. **Separate guardian addresses during import** - Allow different addresses for each guardian rather than copying player's address to all guardians
2. **Primary residence indicator** - Flag which guardian's address is the child's primary residence
3. **Address validation** - Validate postcodes during import for Irish (Eircode) and UK formats

See: [Phase 1: Foundation & Multi-Sport Support](./phase-1-foundation.md) for import enhancements.

---

**Next Phase**: Continue with Phase 1 import framework enhancements
