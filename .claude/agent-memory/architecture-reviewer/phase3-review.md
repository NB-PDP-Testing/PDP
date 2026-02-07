# Phase 3 Architecture Review - Detailed Notes

**Date:** 2026-02-06
**Phase:** 3 - v2 Artifacts Foundation
**Stories:** US-VN-013, US-VN-014

## Files Analyzed

### Core Integration Points
- `packages/backend/convex/actions/whatsapp.ts`
  - `processIncomingMessage` (line 48): Main entry point for WhatsApp messages
  - `processAudioMessage` (line 669): Downloads audio, stores, creates voiceNote
  - `processTextMessage` (line 761): Validates text, creates typed voiceNote
  - Uses `api.models.voiceNotes.createRecordedNote` at line 728 (PUBLIC mutation from internalAction - tech debt)
  - Uses `api.models.voiceNotes.createTypedNote` at line 810 (PUBLIC mutation from internalAction - tech debt)

- `packages/backend/convex/actions/voiceNotes.ts`
  - `transcribeAudio` (line 146): Gets audio, calls OpenAI, stores transcription
  - `updateTranscription` call at line 216 - this is where v2 transcript creation hooks in
  - `buildInsights` (line 273): AI insight extraction (no changes needed in Phase 3)

- `packages/backend/convex/models/voiceNotes.ts`
  - `createRecordedNote` (line 591): Inserts voiceNote, schedules transcribeAudio
  - `createTypedNote` (line 554): Inserts voiceNote with text, schedules buildInsights
  - `updateTranscription` (line 2527): Updates voiceNote with transcription results
  - `updateInsights` (line 2576): Updates insights, also creates voiceNoteInsights records

### Pattern Reference
- `packages/backend/convex/models/aiModelConfig.ts`
  - `getConfigForFeature` (line 41): Public query with feature/scope/org cascade
  - `getConfigForFeatureInternal` (line 117): Internal query version for actions
  - Uses `by_feature_and_scope` and `by_feature_scope_org` indexes
  - Only has platform and organization scopes (no user scope)

### Schema Reference
- voiceNotes table: schema.ts lines 1492-1585
- voiceNoteInsights table: schema.ts lines 1595-1658
- aiModelConfig table: schema.ts lines 3800-3842

## Architecture Decisions Made

### ADR-VN2-007: Feature Flag Storage
- **Decision**: New `featureFlags` table (not extending aiModelConfig)
- **Why**: aiModelConfig stores complex config objects; featureFlags stores booleans. Different concerns.
- **Added user scope**: aiModelConfig only has platform + organization. featureFlags adds user scope for per-coach rollout.
- **3 indexes**: by_featureKey_and_scope, by_featureKey_scope_org, by_featureKey_scope_user
- **Location**: `packages/backend/convex/lib/featureFlags.ts`

### ADR-VN2-008: Artifact ID Generation
- **Decision**: crypto.randomUUID()
- **Why**: Built-in, no deps, UUID v4, generated in action before mutations
- **Important**: artifactId (string) vs Convex _id are DIFFERENT. voiceNoteTranscripts references Convex _id.

### ADR-VN2-009: Dual-Path Processing Order
- **Decision**: v1 voiceNote first, then v2 artifact
- **Why**: Zero regression. v1 flow completely unchanged. If v2 fails, v1 still works.
- **Race condition assessment**: scheduler.runAfter(0) for transcription runs in new transaction; linkToVoiceNote runs synchronously before that. Timing should be safe.

## Key Risks Identified

1. **Race condition** between linkToVoiceNote and transcribeAudio: Low risk. scheduler creates new transaction.
2. **Orphaned artifacts** if link fails: Low risk. Status tracking enables cleanup.
3. **Empty segments array**: Known limitation. Whisper basic API doesn't return segments.
4. **Public mutation calls from internalAction**: Pre-existing tech debt. Do NOT fix in Phase 3.

## Schema Placement
New tables should go AFTER voiceNoteInsights (line ~1658) and BEFORE the AI MODEL CONFIGURATION section (line ~3795). Suggested location: around line 1660-1700, with a clear section header comment.

## What NOT to Change in Phase 3
- createRecordedNote / createTypedNote mutations
- updateTranscription mutation
- updateInsights mutation
- processIncomingMessage command handling (OK/R/SNOOZE/CONFIRM)
- buildInsights action
- Any frontend code (Phase 3 is backend-only)
