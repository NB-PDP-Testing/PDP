## Fix Applied: Voice Note Return Validator Mismatch

**Commit:** `eec126e2` on branch `jkobrien/456_fixVoiceNoteMissingvalue`

### Root Cause
Convex strict return validators on voice note queries were missing fields that exist in the `voiceNotes` schema. When a document contained one of these fields, the validator rejected the entire response, causing a Server Error that crashed the coach dashboard.

### Comprehensive Audit
A field-by-field audit compared all 16 document-level schema fields and all 20 insight sub-object fields against every return validator in `voiceNotes.ts`.

### Changes Made (`packages/backend/convex/models/voiceNotes.ts`)

**1. Added `playerId` to `insightValidator`** (used by all queries)
- Legacy field (`v.optional(v.string())`) present in the schema for backwards compatibility with old voice notes
- Was missing from the shared `insightValidator`, causing any query returning an insight with this field to fail

**2. Added `sessionPlanId` to 4 raw-document return validators**
- `getAllVoiceNotes` — returns raw docs via `...note` spread
- `getVoiceNoteById` — returns raw doc directly
- `getVoiceNotesByCoach` — returns raw docs directly (the crashing query)
- `getNote` (internal) — returns raw doc directly

### Not Affected (Safe)
These queries explicitly select fields in their return objects, so extra schema fields don't leak through:
- `getVoiceNotesForCoachTeams`
- `getVoiceNotesForPlayer`
- `getPendingInsights`

### Verification
- `npx -w packages/backend convex codegen` passes cleanly
- All changes are optional field additions only — no logic changes, no risk to existing data
