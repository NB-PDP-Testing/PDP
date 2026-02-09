# Irish Name Aliases Expansion (2026-02-09)

## Overview

Comprehensive expansion of Irish name phonetic aliases in the voice notes fuzzy matching system to address matching failures for common Irish/GAA player names.

## Problem Statement

**Issue**: Voice notes mentioning "Shawn", "Kloda", or other phonetic spellings of Irish names were failing to match database records with traditional Irish spellings (Sean, Clodagh, etc.).

**Root Cause**: Limited Irish name alias coverage in `stringMatching.ts`:
- **Missing**: Seán/Shawn variants (most common Irish male name)
- **Incomplete**: Only 19 name groups, missing many common GAA names
- **Low similarity scores**: Fuzzy matching alone insufficient (e.g., "shawn" vs "sean" = 0.60, below 0.9 auto-resolve threshold)

## Solution

### Expanded Alias Coverage

**Before**: 19 name groups
**After**: 45+ name groups

### Critical Fixes

| Name | Before | After | Impact |
|------|--------|-------|--------|
| Seán/Shawn | ❌ Not covered | ✅ ["sean", "shawn", "shaun"] | **CRITICAL** - most common Irish male name |
| Clodagh | ⚠️ ["clodagh", "cloda"] only | ✅ ["clodagh", "cloda", "kloda", "chlodagh"] | Covers phonetic + typo variants |
| Ciara | ❌ Not covered | ✅ ["ciara", "kiera", "keara", "kiara"] | Common feminine name |
| Aisling | ❌ Not covered | ✅ ["aisling", "ashling", "ashlinn"] | Frequent mispronunciation |

### Complete List of Additions

#### Girls' Names (28 groups)
- Niamh, Siobhán, Aoife, Caoimhe, Saoirse, Róisín, Méabh/Maeve, Gráinne
- Clodagh, Orlaith, Muireann, Sadhbh, Dearbhla, Fionnuala, Eimear, Áine
- Máire, Bríd, Sinéad, Mairéad, Ciara, Deirdre, Eithne
- Aisling, Étaín, Laoise, Síofra, Bláithín

#### Boys' Names (27 groups)
- Seán, Eoin, Eoghan, Oisín, Ciarán, Tadhg, Cian, Conor, Darragh
- Ruairí, Fionn, Colm, Pádraig, Cathal, Niall, Diarmuid, Dáithí
- Donncha, Fiachra, Enda, Lorcan, Declan, Ronan, Cormac, Fergal, Tiernan

## Technical Implementation

### File: `packages/backend/convex/lib/stringMatching.ts`

```typescript
const IRISH_NAME_ALIASES: string[][] = [
  // Girls' Names
  ["niamh", "neeve", "neve", "neev", "nieve"],
  ["sean", "shawn", "shaun"],  // ← NEW
  ["clodagh", "cloda", "kloda", "chlodagh"],  // ← EXPANDED
  // ... 40+ more groups
];
```

### Matching Algorithm

1. **Alias Check First** (lines 174-179 in `stringMatching.ts`):
   ```typescript
   const searchCanonical = ALIAS_TO_CANONICAL.get(normalizedSearch);
   const firstCanonical = ALIAS_TO_CANONICAL.get(normalizedFirst);
   if (searchCanonical && firstCanonical && searchCanonical === firstCanonical) {
     scores.push(0.9);  // Alias boost
   }
   ```

2. **Fuzzy Fallback**: Levenshtein similarity for non-aliased variants

3. **Auto-Resolve Threshold**: 0.9 (or coach's personalized threshold from trust level)

## Test Coverage

### File: `packages/backend/convex/__tests__/stringMatching.test.ts`

New test suite with 25+ test cases covering:
- **Critical fixes**: Seán/Shawn, Clodagh/Kloda matching
- **Bidirectional**: Database→Voice and Voice→Database
- **Edge cases**: Case insensitivity, diacritics, unrelated names
- **Comprehensive coverage**: All 45+ name groups tested

### Before/After Comparison

| Test Case | Before | After |
|-----------|--------|-------|
| "Shawn" → "Sean" | ❌ 0.60 (fail) | ✅ 0.9+ (auto-resolve) |
| "Kloda" → "Clodagh" | ❌ 0.57 (fail) | ✅ 0.9+ (auto-resolve) |
| "Neeve" → "Niamh" | ⚠️ 0.20 (fuzzy fail) | ✅ 0.9+ (alias) |
| "Kiera" → "Ciara" | ❌ Not covered | ✅ 0.9+ (auto-resolve) |
| "Ashling" → "Aisling" | ❌ Not covered | ✅ 0.9+ (auto-resolve) |

## Impact

### Reduced Disambiguation Prompts
- **Before**: Coaches needed to manually disambiguate common names like "Shawn", "Kloda"
- **After**: Auto-resolves at 0.9+ confidence, reducing coach friction

### Improved Entity Resolution (Phase 5)
- **Enhancement E5** (Coach alias learning) now works correctly for Irish names
- Coaches resolve "Shawn" → "Sean" once, future mentions auto-resolve via alias

### Better WhatsApp Experience
- Fewer "Who did you mean?" prompts
- Faster voice note processing
- More accurate insights delivered to coaches

## Research Sources

- Irish name pronunciation guides
- GAA club rosters (common player names)
- Voice transcription patterns from Whisper API
- Irish naming conventions and anglicization patterns

## Deployment

**Date**: 2026-02-09
**Commit**: [Next commit after 09988ef1]
**Status**: Ready for production deployment
**Breaking Changes**: None (backward compatible)

## Future Enhancements

1. **Regional Variations**: Add Ulster/Munster/Connacht pronunciation variants
2. **Diminutives**: Add common nicknames (Pádraig → Paddy already covered)
3. **Hyphenated Names**: Improve handling of Mary-Kate, etc.
4. **Gaelic Surname Prefixes**: Extend Ó/Mac/Nic handling
5. **Scottish Gaelic**: Add Scottish name variants if expanding to Scottish GAA

## References

- US-VN-005: Levenshtein Fuzzy Matching Backend
- US-VN-006: Find Similar Players Query
- Enhancement E5: Coach Alias Learning
- ADR-VN2-004: Shared Player Matching Logic
