# Bug Fix #456: Voice Note Return Validator Mismatch Crashes Coach Dashboard

## Problem Summary

The coach dashboard (`/orgs/{orgId}/coach`) crashes with a "Something went wrong" error boundary after a voice note is created. The error in the browser console is:

```
Error: [CONVEX Q(models/voiceNotes:getVoiceNotesByCoach)] Server Error
```

## Root Cause

The `getVoiceNotesByCoach` query returns **raw documents** from the database (`return notes`), but its `returns` validator is **missing fields** that exist in the `voiceNotes` schema. When Convex's strict return validation encounters a document field not listed in the validator, it throws a Server Error.

The error propagates because the **CommandPalette** component (`apps/web/src/components/coach/command-palette.tsx`, line 45) calls `useQuery(api.models.voiceNotes.getVoiceNotesByCoach, ...)` and is rendered on **every coach page** via the coach layout. Before any voice notes existed for this coach, the query returned `[]` and the mismatch was invisible. Once a voice note was created, the query returned the new document and the validator rejected it.

## Comprehensive Audit

A full audit of every voice note query's return validator vs. the actual `voiceNotes` schema revealed two categories of missing fields:

### 1. Missing from `insightValidator` (used in ALL queries)

The `insightValidator` (defined at `packages/backend/convex/models/voiceNotes.ts:27-54`) is used as the insight array item validator in every voice note query. It is missing:

| Field | Schema Type | Status |
|-------|-------------|--------|
| `playerId` | `v.optional(v.string())` | **MISSING** - Legacy field for old voice notes (schema line 1531) |

### 2. Missing from document-level return validators

The `sessionPlanId` field exists in the schema (`v.optional(v.id("sessionPlans"))`, schema line 1568) but is missing from the return validators of these queries:

| Query | Line | Returns Raw Docs? | Missing `sessionPlanId` |
|-------|------|-------------------|------------------------|
| `getAllVoiceNotes` | 84 | Yes (+ coachName enrichment) | **YES** |
| `getVoiceNoteById` | 161 | Yes (raw) | **YES** |
| `getVoiceNotesByCoach` | 195 | Yes (raw) | **YES** |
| `getVoiceNotesForCoachTeams` | 237 | No (transforms data) | N/A (intentionally selective) |
| `getVoiceNotesForPlayer` | 440 | Partial (transforms) | N/A (intentionally selective) |
| `getNote` (internal) | 1977 | Yes (raw) | **YES** |

### Queries NOT Affected

These queries transform their return values and intentionally select specific fields:

- `getVoiceNotesForCoachTeams` (line 237) - transforms data, adds `coachName` + `relevantTeamIds`
- `getVoiceNotesForPlayer` (line 440) - transforms data, adds `coachName`
- `getPendingInsights` (line 398) - returns custom `{noteId, insight}` structure
- `getCoachImpactSummary` (line 2113) - returns aggregate data, not documents

## Fix

### A. Add `playerId` to `insightValidator`

```typescript
// packages/backend/convex/models/voiceNotes.ts (line 27-54)
const insightValidator = v.object({
  id: v.string(),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerId: v.optional(v.string()), // <-- ADD: Legacy field for backwards compatibility
  playerName: v.optional(v.string()),
  // ... rest unchanged
});
```

### B. Add `sessionPlanId` to all raw-document return validators

Add to the return validators of `getAllVoiceNotes`, `getVoiceNoteById`, `getVoiceNotesByCoach`, and `getNote`:

```typescript
sessionPlanId: v.optional(v.id("sessionPlans")),
```

## Impact

- **Production:** Coach dashboard for any org where a coach has created voice notes
- **Scope:** All pages under `/orgs/{orgId}/coach/*` (due to CommandPalette in layout)
- **Severity:** Critical - entire coach section is unusable
- **Fix Risk:** Low - only adds optional fields to validators, no logic changes

## Files Changed

- `packages/backend/convex/models/voiceNotes.ts` - Add missing fields to validators
