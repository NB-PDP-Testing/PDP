# Clodagh Matching Issue - Fix Applied (2026-01-22)

## Problem
Voice notes mentioning "Clodagh" (or "Clodagh Barlow") are not being matched to the player roster, even though Clodagh Barlow exists in the system and is on the coach's teams.

## Two-Stage Matching Process

### Stage 1: AI Matching (OpenAI)
- AI receives roster JSON with player IDs, names, age groups, sports
- AI extracts player names from voice note transcription
- AI **attempts to match** names to roster IDs
- **This is where it's currently failing**

### Stage 2: Code Fallback Matching
- If AI doesn't provide player ID, our code tries to match by name
- Multiple strategies: exact match, first+last name, first name only, partial match
- **This is also failing** (reason unknown)

## Changes Applied

### 1. Enhanced Logging (voiceNotes.ts lines 354-371)
Added diagnostic logging to track:
- When AI extracts playerName but NO playerId
- When fallback matching fails
- What roster was provided to AI

### 2. Improved AI Prompt (voiceNotes.ts lines 315-341)
- Made instructions more explicit and directive ("YOU MUST")
- Added 4 concrete examples with realistic player IDs
- Added verification checklist for AI to follow
- Emphasized copying exact "id" field value

### 3. Roster Logging (voiceNotes.ts lines 263-270)
Logs first 10 player names sent to AI for debugging

## How to Diagnose

### Next Steps:
1. **Record a new voice note** mentioning "Clodagh" or "Clodagh Barlow"
2. **Check Convex logs** for these messages:
   ```
   [AI Roster] Providing X players to AI for matching: Clodagh Barlow, ...
   [AI Matching] ⚠️ AI extracted playerName "Clodagh" but NO playerId
   [Player Matching] ❌ No match for "Clodagh". Roster has X players: ...
   [Matching Failed] ❌ Could not match "Clodagh" to roster
   ```

3. **Look for these scenarios:**

   **Scenario A: AI not extracting ID**
   - Log shows: `AI extracted playerName "Clodagh" but NO playerId`
   - Means: AI prompt needs further improvement or AI model issue
   - Solution: Consider switching from Responses API to Chat Completions API

   **Scenario B: Clodagh not in roster**
   - Log shows: `Roster has X players: Sinead, Emma, Katie...` (no Clodagh)
   - Means: Coach assignment issue or team membership issue
   - Solution: Verify coach is assigned to Clodagh's teams

   **Scenario C: Multiple Clodaghs (ambiguous)**
   - Log shows: `AMBIGUOUS: "Clodagh" matches 2 players`
   - Means: Multiple players with same first name
   - Solution: Encourage full names in voice notes

   **Scenario D: Fallback matching bug**
   - Log shows: Clodagh IS in roster, but matching still fails
   - Means: Bug in `findMatchingPlayer()` function
   - Solution: Debug matching logic

## Expected Outcome

After these changes:
- ✅ **Better diagnostics**: Logs will clearly show where matching fails
- ✅ **Improved AI accuracy**: More explicit prompts should help AI extract IDs
- ⚠️ **May still need iteration**: If AI model is inconsistent, may need alternative approach

## Alternative Solutions (if still failing)

### Option 1: Server-Side Matching Only
- Remove player ID extraction from AI prompt
- Let AI extract names only
- Do ALL matching in our code (more reliable)

### Option 2: Use Chat Completions API
- Replace `client.responses.create` with `client.chat.completions.create`
- Use `response_format: { type: "json_schema", ... }` for structured output
- May be more reliable than Responses API

### Option 3: Two-Pass AI Approach
- First pass: Extract player names only
- Match names to roster in our code
- Second pass: Send matched player context to AI for insight generation

## Testing Checklist

- [ ] Record voice note mentioning "Clodagh"
- [ ] Check logs for roster contents
- [ ] Check logs for AI extraction results
- [ ] Check logs for fallback matching attempts
- [ ] Verify if Clodagh gets matched correctly
- [ ] If not, identify which stage failed (AI or code)
- [ ] Apply appropriate fix from alternatives above

---

**Status**: Deployed - Awaiting real-world test
**Priority**: HIGH - Core feature functionality
**Related Issue**: Player matching investigation from 2026-01-21
