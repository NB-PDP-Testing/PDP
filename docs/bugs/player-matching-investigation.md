# Player Matching Investigation: Clodagh Barlow Case
**Date:** January 21, 2026
**Issue:** AI fails to match "Clodagh Barlow" despite being on roster

---

## Symptoms

1. Voice note mentions "Clodagh Barlow Hand Injury"
2. Insight shows as "Clodagh Barlow not matched" in Needs Your Help section
3. Manual assignment modal DOES show "Clodagh Barlow (U18)" in dropdown
4. This confirms Clodagh Barlow IS on the roster

**Screenshots:**
- `Screenshot 2026-01-21 at 19.28.39.png` - Unmatched insight
- `Screenshot 2026-01-21 at 19.28.48.png` - Manual assignment modal showing Clodagh

---

## Current AI Prompt (lines 246-301)

### Roster Format Provided to AI:
```typescript
const rosterContext = players.length
  ? players
      .map(
        (player: any) =>
          `- ${player.firstName} ${player.lastName} (ID: ${player.playerIdentityId})${
            player.ageGroup ? `, Age Group: ${player.ageGroup}` : ""
          }${player.sport ? `, Sport: ${player.sport}` : ""}`
      )
      .join("\n")
  : "No roster context provided.";
```

**Expected format:**
```
- Clodagh Barlow (ID: mx7fsvhh9m9v8qayeetcjvn5g17y95dv), Age Group: U18, Sport: GAA Football
- Sinead Haughey (ID: abc123...), Age Group: U18, Sport: GAA Football
```

### AI Instructions (lines 294-301):
```
Team Roster:
${rosterContext}

Important:
- Always try to match mentioned player names to the roster and include their exact ID
- If a player name doesn't match the roster exactly, still extract the insight with the playerName field
- For team_culture and todo categories, playerName and playerId should be null
- Be specific and actionable in your recommendations
```

---

## Matching Logic (lines 452-545)

### Order of Operations:
1. **Match by ID** - AI provides ID in response
2. **Exact full name match** - Case-insensitive
3. **First + Last name match** - Case-insensitive
4. **First name only** - If unique (warns if ambiguous)
5. **Partial match** - If unique (warns if ambiguous)

### Fallback Matching Code:
```typescript
// Exact full name match
const exactMatch = players.find(
  (player) => player.name.toLowerCase() === normalizedSearch
);

// First name + Last name match
const nameMatch = players.find((player) => {
  const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
  return fullName === normalizedSearch;
});
```

---

## Hypothesis: Why Clodagh Barlow Didn't Match

### Possible Causes:

#### 1. **AI Didn't Extract the ID (Most Likely)**
- The AI is not correctly parsing the roster format
- Roster shows: `Clodagh Barlow (ID: mx7fsvhh9m9v8qayeetcjvn5g17y95dv)`
- But AI returns: `playerId: null`
- **Why:** The ID format might be confusing the model, or the model is not consistently extracting IDs

#### 2. **Player Not in Filtered Roster**
- The roster is filtered to coach's assigned teams
- If Clodagh is on a team the coach isn't assigned to, she won't be in the roster
- **Evidence Against:** Manual assignment modal shows her, using same filter

#### 3. **Name Variation in Voice Note**
- Coach might have said "Cloda" or "Clodah" (pronunciation variation)
- Transcription might have slightly different spelling
- **Check needed:** Review exact transcription text

#### 4. **Roster Query Returns Different Format**
- The `player.name` field might not match `firstName + lastName`
- **Check needed:** Verify player data structure from query

---

## Investigation Steps

### Step 1: Verify Roster Format
**Query to check:**
```typescript
// packages/backend/convex/models/orgPlayerEnrollments.ts
// getPlayersForCoachTeamsInternal or getPlayersForOrgInternal
```

**Expected fields:**
- `playerIdentityId` (ID)
- `firstName`
- `lastName`
- `name` (might be computed or stored)
- `ageGroup`
- `sport`

### Step 2: Check Voice Note Transcription
**Look for:**
- Exact spelling: "Clodagh Barlow" vs "Cloda Barlow" vs "Clodah Barlow"
- Context: "Clodagh Barlow injured her hand" vs just "Clodagh injured her hand"

### Step 3: Review AI Response
**Check Convex logs for:**
- What roster was sent to AI
- What AI returned for this insight
- Whether playerId was populated

### Step 4: Test AI Prompt Explicitly
**Create test case:**
```
Roster:
- Clodagh Barlow (ID: mx7fsvhh9m9v8qayeetcjvn5g17y95dv), Age Group: U18, Sport: GAA Football
- Sinead Haughey (ID: abc123), Age Group: U16, Sport: GAA Football

Voice Note:
"Clodagh Barlow injured her hand during the training session."

Expected Output:
{
  "insights": [{
    "playerName": "Clodagh Barlow",
    "playerId": "mx7fsvhh9m9v8qayeetcjvn5g17y95dv",
    ...
  }]
}
```

---

## Potential Fixes

### Fix 1: Improve Roster Format (RECOMMENDED)
Make the roster format more explicit and consistent:

```typescript
// BEFORE
`- ${player.firstName} ${player.lastName} (ID: ${player.playerIdentityId}), Age Group: ${player.ageGroup}, Sport: ${player.sport}`

// AFTER - More structured
`Player: ${player.firstName} ${player.lastName}
  - ID: ${player.playerIdentityId}
  - Age Group: ${player.ageGroup}
  - Sport: ${player.sport}`
```

Or use a more parse-friendly format:
```typescript
`[${player.playerIdentityId}] ${player.firstName} ${player.lastName} - ${player.ageGroup} ${player.sport}`
```

### Fix 2: Use JSON Format Instead
Instead of plain text roster, provide JSON:

```typescript
const rosterContext = JSON.stringify(
  players.map((player: any) => ({
    id: player.playerIdentityId,
    name: `${player.firstName} ${player.lastName}`,
    firstName: player.firstName,
    lastName: player.lastName,
    ageGroup: player.ageGroup,
    sport: player.sport,
  })),
  null,
  2
);
```

Then update prompt:
```
Team Roster (JSON):
${rosterContext}

When you identify a player, use their exact "id" field from the roster above.
```

### Fix 3: Add Examples to Prompt
Include explicit matching examples:

```
Examples:
- If coach says "Clodagh Barlow injured her hand" and roster has:
  {"id": "abc123", "name": "Clodagh Barlow", ...}
  Then return: {"playerName": "Clodagh Barlow", "playerId": "abc123"}

- If coach says "Sinead had a great session" and roster has:
  {"id": "def456", "name": "Sinead Haughey", ...}
  Then return: {"playerName": "Sinead Haughey", "playerId": "def456"}
```

### Fix 4: Strengthen Fallback Matching
If AI doesn't provide ID, make fallback more robust:

```typescript
// Add fuzzy matching with Levenshtein distance
// Add nickname/shortname support
// Add phonetic matching for Irish names (Clodagh/Cloda)
```

---

## Testing Plan

### Test Case 1: Clodagh Barlow Exact Match
```
Input: "Clodagh Barlow injured her hand"
Roster: Clodagh Barlow (mx7fsvhh9m9v8qayeetcjvn5g17y95dv)
Expected: Match with ID mx7fsvhh9m9v8qayeetcjvn5g17y95dv
```

### Test Case 2: Partial Name
```
Input: "Clodagh needs to improve passing"
Roster: Clodagh Barlow (mx7fsvhh9m9v8qayeetcjvn5g17y95dv)
Expected: Match with ID (if unique first name)
```

### Test Case 3: Multiple Players
```
Input: "Sinead and Clodagh worked well together"
Roster: Sinead Haughey, Clodagh Barlow
Expected: Both matched with correct IDs
```

### Test Case 4: Ambiguous First Name
```
Input: "Clodagh improved her kicking"
Roster: Clodagh Barlow (U18), Clodagh O'Neill (U16)
Expected: No auto-match (ambiguous), manual assignment required
```

---

## Priority: HIGH
**Impact:** Core feature functionality
**User Experience:** Requires manual workaround
**Frequency:** Unknown (need to check logs for similar failures)

---

## Next Steps

1. ✅ Document the issue
2. ⏳ Check Convex logs for AI response
3. ⏳ Verify player data structure from query
4. ⏳ Test with different roster formats
5. ⏳ Implement Fix 2 (JSON format) - most reliable
6. ⏳ Add explicit examples to prompt
7. ⏳ Test with multiple voice notes

---

*Investigation started: January 21, 2026*
